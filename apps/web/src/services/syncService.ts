/**
 * 同步服务 - 管理本地数据与服务器的双向同步
 * 支持：离线优先、增量同步、冲突检测、智能合并
 */

import { apiClient, SyncRecord, PushPayload } from './apiClient'
import type { Record } from '@personal-accounting/shared/types'
import { STORAGE_KEY } from '@personal-accounting/shared/constants'

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
    const data = localStorage.getItem(SYNC_META_KEY)
    return data ? JSON.parse(data) : { lastSyncVersion: 0, lastSyncAt: null, serverUrl: null }
  }

  private saveSyncMeta(): void {
    localStorage.setItem(SYNC_META_KEY, JSON.stringify(this.syncMeta))
  }

  private loadPendingChanges(): Map<string, PendingChange> {
    const data = localStorage.getItem(PENDING_CHANGES_KEY)
    return data ? new Map(JSON.parse(data)) : new Map()
  }

  private savePendingChanges(): void {
    localStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify([...this.pendingChanges]))
  }

  private loadRecordVersions(): Map<string, RecordVersion> {
    const data = localStorage.getItem(RECORD_VERSIONS_KEY)
    return data ? new Map(JSON.parse(data)) : new Map()
  }

  private saveRecordVersions(): void {
    localStorage.setItem(RECORD_VERSIONS_KEY, JSON.stringify([...this.recordVersions]))
  }

  private getLocalRecords(): Record[] {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  }

  private setLocalRecords(records: Record[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }))
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

  async devLogin(identifier: string, nickname?: string): Promise<boolean> {
    try {
      const result = await apiClient.devLogin(identifier, nickname)
      apiClient.setToken(result.accessToken)
      return true
    } catch {
      return false
    }
  }

  // ==================== Diff 合并算法 ====================

  /**
   * 对比本地和服务器数据，智能合并
   * 策略：
   * 1. 服务器有本地无 -> 添加到本地
   * 2. 本地有服务器无 -> 待推送到服务器
   * 3. 双方都有且无本地修改 -> 使用服务器版本
   * 4. 双方都有且有本地修改 -> 冲突检测，按时间戳合并
   */
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

    // 建立服务器记录映射（按 id 和 clientId）
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
          // 冲突：本地修改了，服务器删除了
          conflicts.push({
            id: localId,
            localRecord,
            serverRecord,
            conflictType: 'update_delete',
            resolvedBy: 'server', // 默认以服务器为准
          })
        }
        // 从本地删除
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
          // 冲突：本地删除了，服务器更新了
          conflicts.push({
            id: localId,
            localRecord,
            serverRecord,
            conflictType: 'delete_update',
            resolvedBy: 'server',
          })
          // 恢复服务器版本
          const restoredRecord = this.serverToLocal(serverRecord)
          mergedMap.set(restoredRecord.id, restoredRecord)
          this.pendingChanges.delete(localId)
        } else {
          // 双方都更新了 -> 按时间戳合并
          const localTime = new Date(pendingChange.timestamp).getTime()
          const serverTime = new Date(serverRecord.updatedAt).getTime()
          
          if (serverTime > localTime) {
            // 服务器更新更晚，使用服务器版本
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
            // 本地更新更晚，保留本地版本但记录冲突
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
        // 更新版本信息
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
    console.log('[Sync] 收集待推送变更, pendingChanges:', [...this.pendingChanges.entries()])
    for (const [id, change] of this.pendingChanges) {
      const version = this.recordVersions.get(id)
      console.log(`[Sync] 检查变更: id=${id}, action=${change.action}, version=`, version)
      
      if (change.action === 'create' && version?.isLocalOnly) {
        // 优先从 mergedMap 获取，如果没有则从 pendingChange.data 获取
        const record = mergedMap.get(id) || (change.data as Record | undefined)
        console.log(`[Sync] create 变更, record=`, record)
        if (record && record.id) {
          toCreate.push(record)
        }
      } else if (change.action === 'update') {
        // 检查是否已被服务器更新覆盖
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

    // 检测本地有但服务器没有的记录（首次同步或未被追踪的本地记录）
    for (const [id, record] of mergedMap) {
      const version = this.recordVersions.get(id)
      const alreadyInToCreate = toCreate.some(r => r.id === id)
      
      // 检查是否已存在于服务器
      const existsOnServer = serverByClientId.has(id) || 
                             serverMap.has(id) || 
                             (version?.serverId && serverMap.has(version.serverId)) ||
                             (version && !version.isLocalOnly && version.serverId)
      
      // 如果记录不在服务器上，且不在待创建列表中
      if (!existsOnServer && !alreadyInToCreate) {
        console.log(`[Sync] 检测到未追踪的本地记录，添加到 toCreate: ${id}`)
        toCreate.push(record)
        // 标记为待同步
        this.recordVersions.set(id, {
          id,
          syncVersion: 0,
          localUpdatedAt: record.createdAt || new Date().toISOString(),
          isLocalOnly: true,
        })
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
      console.log('[Sync] pendingChanges:', [...this.pendingChanges.entries()])
      console.log('[Sync] recordVersions:', [...this.recordVersions.entries()])
      
      // 1. 拉取服务器变更
      const pullResult = await apiClient.pull(this.syncMeta.lastSyncVersion)
      console.log('[Sync] Pull 结果:', pullResult)
      
      // 2. Diff 合并
      const localRecords = this.getLocalRecords()
      const localMap = new Map(localRecords.map(r => [r.id, r]))
      console.log('[Sync] 本地记录数:', localRecords.length)
      
      const { mergedRecords, toCreate, toUpdate, toDelete, conflicts, mergedCount } = 
        this.diffAndMerge(localMap, pullResult.changes)
      
      console.log('[Sync] Diff 结果:', { 
        toCreate: toCreate.length, 
        toUpdate: toUpdate.length, 
        toDelete: toDelete.length,
        conflicts: conflicts.length,
        mergedCount 
      })
      console.log('[Sync] toCreate 详情:', toCreate)
      
      result.conflicts = conflicts.length
      result.conflictRecords = conflicts
      result.merged = mergedCount
      result.pulled = pullResult.changes.length

      // 3. 保存合并后的数据
      this.setLocalRecords(mergedRecords)

      // 4. 推送本地变更
      if (toCreate.length > 0 || toUpdate.length > 0 || toDelete.length > 0) {
        const pushPayload: PushPayload = {
          created: toCreate.map(r => ({
            clientId: r.id,
            type: r.type,
            amount: r.amount,
            category: r.category,
            date: r.date,
            note: r.note,
          })),
          updated: toUpdate.map(u => ({
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
          // 更新版本信息
          for (const record of toCreate) {
            const version = this.recordVersions.get(record.id)
            if (version) {
              version.isLocalOnly = false
              version.syncVersion = pushResult.serverVersion
            }
          }
          
          // 清除已推送的变更
          for (const record of toCreate) {
            this.pendingChanges.delete(record.id)
          }
          for (const update of toUpdate) {
            this.pendingChanges.delete(update.id)
          }
          for (const id of toDelete) {
            this.pendingChanges.delete(id)
            this.recordVersions.delete(id)
          }
          
          this.savePendingChanges()
          this.saveRecordVersions()
        }

        this.syncMeta.lastSyncVersion = pushResult.serverVersion
      } else {
        console.log('[Sync] 无需推送')
        this.syncMeta.lastSyncVersion = pullResult.serverVersion
      }

      // 5. 更新同步元数据
      this.syncMeta.lastSyncAt = new Date().toISOString()
      this.saveSyncMeta()

      result.success = true
      console.log('[Sync] 同步完成:', result)
    } catch (error) {
      console.error('[Sync] 同步失败:', error)
      result.error = error instanceof Error ? error.message : 'Unknown error'
    }

    return result
  }

  async fullSync(): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      pulled: 0,
      pushed: 0,
      conflicts: 0,
      merged: 0,
    }

    try {
      // 获取本地数据
      const localRecords = this.getLocalRecords()
      const localOnlyRecords = localRecords.filter(r => {
        const version = this.recordVersions.get(r.id)
        return version?.isLocalOnly
      })

      // 获取服务器全量数据
      const fullData = await apiClient.fullSync()
      
      // 合并：服务器数据 + 本地独有数据
      const serverRecords: Record[] = fullData.records.map(r => this.serverToLocal(r))
      const serverIds = new Set(fullData.records.map(r => r.clientId || r.id))
      
      // 添加本地独有的记录
      const mergedRecords = [...serverRecords]
      const toCreate: Record[] = []
      
      for (const localRecord of localOnlyRecords) {
        if (!serverIds.has(localRecord.id)) {
          mergedRecords.push(localRecord)
          toCreate.push(localRecord)
        }
      }

      // 保存合并后的数据
      this.setLocalRecords(mergedRecords)
      
      // 更新版本信息
      this.recordVersions.clear()
      for (const sr of fullData.records) {
        const localId = sr.clientId || sr.id
        this.recordVersions.set(localId, {
          id: localId,
          serverId: sr.id,
          syncVersion: sr.syncVersion,
          localUpdatedAt: sr.updatedAt,
          serverUpdatedAt: sr.updatedAt,
          isLocalOnly: false,
        })
      }

      // 推送本地独有记录
      if (toCreate.length > 0) {
        const pushPayload: PushPayload = {
          created: toCreate.map(r => ({
            clientId: r.id,
            type: r.type,
            amount: r.amount,
            category: r.category,
            date: r.date,
            note: r.note,
          })),
          updated: [],
          deleted: [],
        }
        
        const pushResult = await apiClient.push(pushPayload)
        result.pushed = pushResult.created
        
        // 更新版本信息
        for (const record of toCreate) {
          this.recordVersions.set(record.id, {
            id: record.id,
            syncVersion: pushResult.serverVersion,
            localUpdatedAt: new Date().toISOString(),
            isLocalOnly: false,
          })
        }
      }

      // 清除待同步变更
      this.pendingChanges.clear()
      this.savePendingChanges()
      this.saveRecordVersions()

      // 更新同步元数据
      this.syncMeta.lastSyncVersion = fullData.serverVersion
      this.syncMeta.lastSyncAt = new Date().toISOString()
      this.saveSyncMeta()

      result.success = true
      result.pulled = fullData.records.length
      result.merged = serverRecords.length
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error'
    }

    return result
  }

  clearSyncData(): void {
    this.syncMeta = { lastSyncVersion: 0, lastSyncAt: null, serverUrl: null }
    this.pendingChanges.clear()
    this.recordVersions.clear()
    this.saveSyncMeta()
    this.savePendingChanges()
    this.saveRecordVersions()
    apiClient.clearToken()
  }
}

export const syncService = new SyncService()
