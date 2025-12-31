/**
 * 同步服务 - 管理本地数据与服务器的双向同步
 * 微信小程序版本
 */

import { apiClient, SyncRecord, PushPayload } from './apiClient'
import type { Record } from '../shared/types'
import { STORAGE_KEY } from '../shared/constants'

// 存储键
const SYNC_META_KEY = 'pa_sync_meta'
const PENDING_CHANGES_KEY = 'pa_pending_changes'
const RECORD_VERSIONS_KEY = 'pa_record_versions'

interface SyncMeta {
  lastSyncVersion: number
  lastSyncAt: string | null
  serverUrl: string | null
}

interface RecordVersion {
  id: string
  serverId?: string
  syncVersion: number
  localUpdatedAt: string
  serverUpdatedAt?: string
  isLocalOnly: boolean
}

interface PendingChange {
  id: string
  action: 'create' | 'update' | 'delete'
  data?: Partial<Record>
  timestamp: string
}

export interface ConflictRecord {
  id: string
  localRecord?: Record
  serverRecord?: SyncRecord
  conflictType: 'update_update' | 'update_delete' | 'delete_update'
  resolvedBy?: 'local' | 'server' | 'merge'
}

export type SyncState = 'idle' | 'checking' | 'syncing' | 'success' | 'error' | 'offline'

export interface SyncResult {
  success: boolean
  pulled: number
  pushed: number
  conflicts: number
  merged: number
  error?: string
  conflictRecords?: ConflictRecord[]
}

class SyncService {
  private syncMeta: SyncMeta
  private pendingChanges: Map<string, PendingChange>
  private recordVersions: Map<string, RecordVersion>

  constructor() {
    this.syncMeta = this.loadSyncMeta()
    this.pendingChanges = this.loadPendingChanges()
    this.recordVersions = this.loadRecordVersions()
  }

  private loadSyncMeta(): SyncMeta {
    try {
      const data = wx.getStorageSync(SYNC_META_KEY)
      return data || { lastSyncVersion: 0, lastSyncAt: null, serverUrl: null }
    } catch {
      return { lastSyncVersion: 0, lastSyncAt: null, serverUrl: null }
    }
  }

  private saveSyncMeta(): void {
    wx.setStorageSync(SYNC_META_KEY, this.syncMeta)
  }

  private loadPendingChanges(): Map<string, PendingChange> {
    try {
      const data = wx.getStorageSync(PENDING_CHANGES_KEY)
      return data ? new Map(data) : new Map()
    } catch {
      return new Map()
    }
  }

  private savePendingChanges(): void {
    wx.setStorageSync(PENDING_CHANGES_KEY, [...this.pendingChanges])
  }

  private loadRecordVersions(): Map<string, RecordVersion> {
    try {
      const data = wx.getStorageSync(RECORD_VERSIONS_KEY)
      return data ? new Map(data) : new Map()
    } catch {
      return new Map()
    }
  }

  private saveRecordVersions(): void {
    wx.setStorageSync(RECORD_VERSIONS_KEY, [...this.recordVersions])
  }

  private getLocalRecords(): Record[] {
    try {
      return wx.getStorageSync(STORAGE_KEY) || []
    } catch {
      return []
    }
  }

  private setLocalRecords(records: Record[]): void {
    wx.setStorageSync(STORAGE_KEY, records)
  }

  getSyncMeta(): SyncMeta {
    return { ...this.syncMeta }
  }

  getPendingCount(): number {
    return this.pendingChanges.size
  }

  // ==================== 变更追踪 ====================

  trackCreate(record: Record): void {
    const now = new Date().toISOString()
    this.pendingChanges.set(record.id, {
      id: record.id,
      action: 'create',
      data: record,
      timestamp: now,
    })
    this.recordVersions.set(record.id, {
      id: record.id,
      syncVersion: 0,
      localUpdatedAt: now,
      isLocalOnly: true,
    })
    this.savePendingChanges()
    this.saveRecordVersions()
  }

  trackUpdate(id: string, data: Partial<Record>): void {
    const now = new Date().toISOString()
    const existing = this.pendingChanges.get(id)

    if (existing?.action === 'create') {
      existing.data = { ...existing.data, ...data }
      existing.timestamp = now
    } else {
      this.pendingChanges.set(id, {
        id,
        action: 'update',
        data: existing?.data ? { ...existing.data, ...data } : data,
        timestamp: now,
      })
    }

    const version = this.recordVersions.get(id)
    if (version) {
      version.localUpdatedAt = now
      this.recordVersions.set(id, version)
    }

    this.savePendingChanges()
    this.saveRecordVersions()
  }

  trackDelete(id: string): void {
    const existing = this.pendingChanges.get(id)

    if (existing?.action === 'create') {
      this.pendingChanges.delete(id)
      this.recordVersions.delete(id)
    } else {
      this.pendingChanges.set(id, {
        id,
        action: 'delete',
        timestamp: new Date().toISOString(),
      })
    }

    this.savePendingChanges()
    this.saveRecordVersions()
  }

  // ==================== 服务器连接 ====================

  async discoverServer(url: string): Promise<boolean> {
    try {
      const normalizedUrl = url.replace(/\/$/, '')
      const pingResult = await apiClient.ping(normalizedUrl)
      if (pingResult.status === 'ok') {
        this.syncMeta.serverUrl = normalizedUrl
        this.saveSyncMeta()
        apiClient.setBaseUrl(normalizedUrl)
        return true
      }
      return false
    } catch {
      return false
    }
  }

  async checkConnection(): Promise<boolean> {
    if (!this.syncMeta.serverUrl) return false
    try {
      apiClient.setBaseUrl(this.syncMeta.serverUrl)
      await apiClient.ping(this.syncMeta.serverUrl)
      return true
    } catch {
      return false
    }
  }

  async devLogin(identifier: string): Promise<boolean> {
    try {
      const result = await apiClient.devLogin(identifier)
      apiClient.setToken(result.accessToken)
      return true
    } catch {
      return false
    }
  }

  disconnect(): void {
    this.syncMeta = { lastSyncVersion: 0, lastSyncAt: null, serverUrl: null }
    this.saveSyncMeta()
    apiClient.clearToken()
    // 清除同步相关数据但保留本地记录
    this.pendingChanges.clear()
    this.recordVersions.clear()
    this.savePendingChanges()
    this.saveRecordVersions()
  }

  // ==================== Diff 合并算法 ====================

  private diffAndMerge(
    localMap: Map<string, Record>,
    serverChanges: SyncRecord[]
  ): {
    mergedRecords: Record[]
    toCreate: Record[]
    toUpdate: Array<{ id: string; data: Partial<Record>; syncVersion: number }>
    toDelete: string[]
    conflicts: ConflictRecord[]
    mergedCount: number
  } {
    const mergedMap = new Map(localMap)
    const toCreate: Record[] = []
    const toUpdate: Array<{ id: string; data: Partial<Record>; syncVersion: number }> = []
    const toDelete: string[] = []
    const conflicts: ConflictRecord[] = []
    let mergedCount = 0

    // 建立服务器记录映射
    const serverMap = new Map<string, SyncRecord>()
    const serverByClientId = new Map<string, SyncRecord>()
    for (const sr of serverChanges) {
      serverMap.set(sr.id, sr)
      if (sr.clientId) {
        serverByClientId.set(sr.clientId, sr)
      }
    }

    // 处理服务器变更
    for (const serverRecord of serverChanges) {
      const localId = serverRecord.clientId || serverRecord.id
      const localRecord = mergedMap.get(localId) || mergedMap.get(serverRecord.id)
      const pendingChange = this.pendingChanges.get(localId) || this.pendingChanges.get(serverRecord.id)
      const version = this.recordVersions.get(localId) || this.recordVersions.get(serverRecord.id)

      if (serverRecord.deletedAt) {
        // 服务器删除了记录
        if (localRecord && pendingChange?.action === 'update') {
          conflicts.push({
            id: localId,
            localRecord,
            serverRecord,
            conflictType: 'update_delete',
            resolvedBy: 'server',
          })
        }
        mergedMap.delete(localId)
        mergedMap.delete(serverRecord.id)
        this.pendingChanges.delete(localId)
        this.recordVersions.delete(localId)
      } else if (!localRecord) {
        // 服务器有，本地无 -> 添加到本地
        const newRecord = this.serverToLocal(serverRecord)
        mergedMap.set(newRecord.id, newRecord)
        this.recordVersions.set(newRecord.id, {
          id: newRecord.id,
          serverId: serverRecord.id,
          syncVersion: serverRecord.syncVersion,
          localUpdatedAt: serverRecord.updatedAt,
          serverUpdatedAt: serverRecord.updatedAt,
          isLocalOnly: false,
        })
        mergedCount++
      } else if (pendingChange) {
        // 双方都有修改 -> 冲突检测
        if (pendingChange.action === 'delete') {
          conflicts.push({
            id: localId,
            localRecord,
            serverRecord,
            conflictType: 'delete_update',
            resolvedBy: 'server',
          })
          const restoredRecord = this.serverToLocal(serverRecord)
          mergedMap.set(restoredRecord.id, restoredRecord)
          this.pendingChanges.delete(localId)
        } else {
          // 双方都更新了 -> 按时间戳合并
          const localTime = new Date(pendingChange.timestamp).getTime()
          const serverTime = new Date(serverRecord.updatedAt).getTime()

          if (serverTime > localTime) {
            const updatedRecord = this.serverToLocal(serverRecord)
            mergedMap.set(updatedRecord.id, updatedRecord)
            this.pendingChanges.delete(localId)
            conflicts.push({
              id: localId,
              localRecord,
              serverRecord,
              conflictType: 'update_update',
              resolvedBy: 'server',
            })
          } else {
            conflicts.push({
              id: localId,
              localRecord,
              serverRecord,
              conflictType: 'update_update',
              resolvedBy: 'local',
            })
          }
          mergedCount++
        }
        this.recordVersions.set(localId, {
          id: localId,
          serverId: serverRecord.id,
          syncVersion: serverRecord.syncVersion,
          localUpdatedAt: version?.localUpdatedAt || new Date().toISOString(),
          serverUpdatedAt: serverRecord.updatedAt,
          isLocalOnly: false,
        })
      } else {
        // 本地无修改，使用服务器版本
        const updatedRecord = this.serverToLocal(serverRecord)
        mergedMap.set(updatedRecord.id, updatedRecord)
        this.recordVersions.set(updatedRecord.id, {
          id: updatedRecord.id,
          serverId: serverRecord.id,
          syncVersion: serverRecord.syncVersion,
          localUpdatedAt: serverRecord.updatedAt,
          serverUpdatedAt: serverRecord.updatedAt,
          isLocalOnly: false,
        })
        mergedCount++
      }
    }

    // 收集待推送的本地变更
    for (const [id, change] of this.pendingChanges) {
      const version = this.recordVersions.get(id)

      if (change.action === 'create' && version?.isLocalOnly) {
        const record = mergedMap.get(id)
        if (record) {
          toCreate.push(record)
        }
      } else if (change.action === 'update') {
        const serverRecord = serverByClientId.get(id) || serverMap.get(version?.serverId || '')
        if (!serverRecord || new Date(change.timestamp) > new Date(serverRecord.updatedAt)) {
          toUpdate.push({
            id: version?.serverId || id,
            data: change.data || {},
            syncVersion: version?.syncVersion || 0,
          })
        }
      } else if (change.action === 'delete') {
        const serverId = version?.serverId || id
        if (!version?.isLocalOnly) {
          toDelete.push(serverId)
        }
      }
    }

    this.saveRecordVersions()
    this.savePendingChanges()

    return {
      mergedRecords: Array.from(mergedMap.values()),
      toCreate,
      toUpdate,
      toDelete,
      conflicts,
      mergedCount,
    }
  }

  private serverToLocal(serverRecord: SyncRecord): Record {
    return {
      id: serverRecord.clientId || serverRecord.id,
      type: serverRecord.type,
      amount: serverRecord.amount,
      category: serverRecord.category,
      date: serverRecord.date,
      note: serverRecord.note || undefined,
      createdAt: serverRecord.createdAt,
    }
  }

  // ==================== 同步操作 ====================

  async sync(): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      pulled: 0,
      pushed: 0,
      conflicts: 0,
      merged: 0,
      conflictRecords: [],
    }

    try {
      console.log('[Sync] 开始同步...')

      // 1. 拉取服务器变更
      const pullResult = await apiClient.pull(this.syncMeta.lastSyncVersion)
      console.log('[Sync] Pull 结果:', pullResult)

      // 2. Diff 合并
      const localRecords = this.getLocalRecords()
      const localMap = new Map(localRecords.map((r) => [r.id, r]))

      const { mergedRecords, toCreate, toUpdate, toDelete, conflicts, mergedCount } = this.diffAndMerge(
        localMap,
        pullResult.changes
      )

      result.conflicts = conflicts.length
      result.conflictRecords = conflicts
      result.merged = mergedCount
      result.pulled = pullResult.changes.length

      // 3. 保存合并后的数据
      this.setLocalRecords(mergedRecords)

      // 4. 推送本地变更
      if (toCreate.length > 0 || toUpdate.length > 0 || toDelete.length > 0) {
        const pushPayload: PushPayload = {
          created: toCreate.map((r) => ({
            clientId: r.id,
            type: r.type,
            amount: r.amount,
            category: r.category,
            date: r.date,
            note: r.note,
          })),
          updated: toUpdate.map((u) => ({
            id: u.id,
            ...u.data,
            syncVersion: u.syncVersion,
          })),
          deleted: toDelete,
        }

        console.log('[Sync] Push payload:', pushPayload)
        const pushResult = await apiClient.push(pushPayload)
        console.log('[Sync] Push 结果:', pushResult)

        result.pushed = pushResult.created + pushResult.updated + pushResult.deleted

        // 清除已同步的变更
        if (pushResult.conflicts.length === 0) {
          for (const record of toCreate) {
            const version = this.recordVersions.get(record.id)
            if (version) {
              version.isLocalOnly = false
              version.syncVersion = pushResult.serverVersion
            }
            this.pendingChanges.delete(record.id)
          }
          for (const update of toUpdate) {
            this.pendingChanges.delete(update.id)
          }
          for (const id of toDelete) {
            this.pendingChanges.delete(id)
            this.recordVersions.delete(id)
          }

          this.saveRecordVersions()
          this.savePendingChanges()
        }

        this.syncMeta.lastSyncVersion = pushResult.serverVersion
      } else {
        this.syncMeta.lastSyncVersion = pullResult.serverVersion
      }

      // 5. 更新同步元数据
      this.syncMeta.lastSyncAt = new Date().toISOString()
      this.saveSyncMeta()

      result.success = true
      console.log('[Sync] 同步完成:', result)
    } catch (error) {
      console.error('[Sync] 同步失败:', error)
      result.error = error instanceof Error ? error.message : '同步失败'
    }

    return result
  }

  // 全量同步
  async fullSync(): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      pulled: 0,
      pushed: 0,
      conflicts: 0,
      merged: 0,
    }

    try {
      const fullData = await apiClient.fullSync()

      // 使用服务器数据覆盖本地
      const records = fullData.records
        .filter((r) => !r.deletedAt)
        .map((r) => this.serverToLocal(r))

      this.setLocalRecords(records)

      // 重置版本追踪
      this.recordVersions.clear()
      for (const r of fullData.records) {
        if (!r.deletedAt) {
          this.recordVersions.set(r.clientId || r.id, {
            id: r.clientId || r.id,
            serverId: r.id,
            syncVersion: r.syncVersion,
            localUpdatedAt: r.updatedAt,
            serverUpdatedAt: r.updatedAt,
            isLocalOnly: false,
          })
        }
      }
      this.pendingChanges.clear()

      this.syncMeta.lastSyncVersion = fullData.serverVersion
      this.syncMeta.lastSyncAt = new Date().toISOString()

      this.saveSyncMeta()
      this.saveRecordVersions()
      this.savePendingChanges()

      result.success = true
      result.pulled = records.length
    } catch (error) {
      result.error = error instanceof Error ? error.message : '全量同步失败'
    }

    return result
  }
}

export const syncService = new SyncService()
