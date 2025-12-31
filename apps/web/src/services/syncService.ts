/**
 * 同步服务 - 管理本地数据与服务器的同步
 */

import { apiClient, SyncRecord, PushPayload } from './apiClient'
import type { Record } from '@personal-accounting/shared/types'

// 同步元数据存储键
const SYNC_META_KEY = 'pa_sync_meta'
const PENDING_CHANGES_KEY = 'pa_pending_changes'
const STORAGE_KEY = 'pa_records'

interface SyncMeta {
  lastSyncVersion: number
  lastSyncAt: string | null
  serverUrl: string | null
}

interface PendingChanges {
  created: Record[]
  updated: Array<{ id: string; data: Partial<Record>; originalSyncVersion?: number }>
  deleted: string[]
}

export type SyncState = 'idle' | 'checking' | 'syncing' | 'success' | 'error' | 'offline'

export interface SyncResult {
  success: boolean
  pulled: number
  pushed: number
  conflicts: number
  error?: string
}

class SyncService {
  private syncMeta: SyncMeta
  private pendingChanges: PendingChanges

  constructor() {
    this.syncMeta = this.loadSyncMeta()
    this.pendingChanges = this.loadPendingChanges()
  }

  private loadSyncMeta(): SyncMeta {
    const data = localStorage.getItem(SYNC_META_KEY)
    if (data) {
      return JSON.parse(data)
    }
    return {
      lastSyncVersion: 0,
      lastSyncAt: null,
      serverUrl: null,
    }
  }

  private saveSyncMeta(): void {
    localStorage.setItem(SYNC_META_KEY, JSON.stringify(this.syncMeta))
  }

  private loadPendingChanges(): PendingChanges {
    const data = localStorage.getItem(PENDING_CHANGES_KEY)
    if (data) {
      return JSON.parse(data)
    }
    return { created: [], updated: [], deleted: [] }
  }

  private savePendingChanges(): void {
    localStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(this.pendingChanges))
  }

  // 获取本地记录
  private getLocalRecords(): Record[] {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  }

  // 保存本地记录
  private setLocalRecords(records: Record[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  }

  // 获取同步元数据
  getSyncMeta(): SyncMeta {
    return { ...this.syncMeta }
  }

  // 获取待同步变更数量
  getPendingCount(): number {
    return (
      this.pendingChanges.created.length +
      this.pendingChanges.updated.length +
      this.pendingChanges.deleted.length
    )
  }

  // 记录新建操作（待同步）
  trackCreate(record: Record): void {
    this.pendingChanges.created.push(record)
    this.savePendingChanges()
  }

  // 记录更新操作（待同步）
  trackUpdate(id: string, data: Partial<Record>, syncVersion?: number): void {
    // 检查是否在 created 中
    const createdIndex = this.pendingChanges.created.findIndex(r => r.id === id)
    if (createdIndex !== -1) {
      // 更新 created 中的记录
      this.pendingChanges.created[createdIndex] = {
        ...this.pendingChanges.created[createdIndex],
        ...data,
      }
    } else {
      // 检查是否已有更新记录
      const existingIndex = this.pendingChanges.updated.findIndex(u => u.id === id)
      if (existingIndex !== -1) {
        this.pendingChanges.updated[existingIndex].data = {
          ...this.pendingChanges.updated[existingIndex].data,
          ...data,
        }
      } else {
        this.pendingChanges.updated.push({ id, data, originalSyncVersion: syncVersion })
      }
    }
    this.savePendingChanges()
  }

  // 记录删除操作（待同步）
  trackDelete(id: string): void {
    // 检查是否在 created 中（本地新建后又删除，直接移除）
    const createdIndex = this.pendingChanges.created.findIndex(r => r.id === id)
    if (createdIndex !== -1) {
      this.pendingChanges.created.splice(createdIndex, 1)
    } else {
      // 从 updated 中移除
      this.pendingChanges.updated = this.pendingChanges.updated.filter(u => u.id !== id)
      // 添加到 deleted
      if (!this.pendingChanges.deleted.includes(id)) {
        this.pendingChanges.deleted.push(id)
      }
    }
    this.savePendingChanges()
  }

  // 发现服务器
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

  // 检查服务器连接
  async checkConnection(): Promise<boolean> {
    if (!this.syncMeta.serverUrl) {
      return false
    }

    try {
      apiClient.setBaseUrl(this.syncMeta.serverUrl)
      await apiClient.ping(this.syncMeta.serverUrl)
      return true
    } catch {
      return false
    }
  }

  // 开发环境登录
  async devLogin(identifier: string): Promise<boolean> {
    try {
      const result = await apiClient.devLogin(identifier)
      apiClient.setToken(result.accessToken)
      return true
    } catch {
      return false
    }
  }

  // 检查是否需要同步
  async checkSyncStatus(): Promise<{ needsSync: boolean; serverVersion: number }> {
    try {
      const status = await apiClient.getSyncStatus()
      return {
        needsSync: status.needsSync || this.getPendingCount() > 0,
        serverVersion: status.serverVersion,
      }
    } catch {
      return { needsSync: false, serverVersion: 0 }
    }
  }

  // 执行同步
  async sync(): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      pulled: 0,
      pushed: 0,
      conflicts: 0,
    }

    try {
      // 1. 先推送本地变更
      if (this.getPendingCount() > 0) {
        const pushPayload: PushPayload = {
          created: this.pendingChanges.created.map(r => ({
            clientId: r.id,
            type: r.type,
            amount: r.amount,
            category: r.category,
            date: r.date,
            note: r.note,
          })),
          updated: this.pendingChanges.updated.map(u => ({
            id: u.id,
            ...u.data,
            syncVersion: u.originalSyncVersion,
          })),
          deleted: this.pendingChanges.deleted,
        }

        const pushResult = await apiClient.push(pushPayload)
        result.pushed = pushResult.created + pushResult.updated + pushResult.deleted
        result.conflicts = pushResult.conflicts.length

        // 清除已同步的变更
        if (pushResult.conflicts.length === 0) {
          this.pendingChanges = { created: [], updated: [], deleted: [] }
          this.savePendingChanges()
        }

        this.syncMeta.lastSyncVersion = pushResult.serverVersion
      }

      // 2. 拉取服务器变更
      const pullResult = await apiClient.pull(this.syncMeta.lastSyncVersion)
      
      if (pullResult.changes.length > 0) {
        this.applyServerChanges(pullResult.changes)
        result.pulled = pullResult.changes.length
      }

      // 3. 更新同步元数据
      this.syncMeta.lastSyncVersion = pullResult.serverVersion
      this.syncMeta.lastSyncAt = new Date().toISOString()
      this.saveSyncMeta()

      result.success = true
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error'
    }

    return result
  }

  // 应用服务器变更到本地
  private applyServerChanges(changes: SyncRecord[]): void {
    const localRecords = this.getLocalRecords()
    const recordMap = new Map(localRecords.map(r => [r.id, r]))

    for (const change of changes) {
      if (change.deletedAt) {
        // 删除记录
        recordMap.delete(change.id)
        // 也通过 clientId 查找删除
        if (change.clientId) {
          for (const [id, record] of recordMap) {
            if (record.id === change.clientId) {
              recordMap.delete(id)
              break
            }
          }
        }
      } else {
        // 新建或更新记录
        const localRecord: Record = {
          id: change.clientId || change.id,
          type: change.type,
          amount: change.amount,
          category: change.category,
          date: change.date,
          note: change.note || undefined,
          createdAt: change.createdAt,
        }
        recordMap.set(localRecord.id, localRecord)
      }
    }

    this.setLocalRecords(Array.from(recordMap.values()))
  }

  // 全量同步（首次同步或数据恢复）
  async fullSync(): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      pulled: 0,
      pushed: 0,
      conflicts: 0,
    }

    try {
      const fullData = await apiClient.fullSync()
      
      // 转换并保存所有记录
      const records: Record[] = fullData.records.map(r => ({
        id: r.clientId || r.id,
        type: r.type,
        amount: r.amount,
        category: r.category,
        date: r.date,
        note: r.note || undefined,
        createdAt: r.createdAt,
      }))

      this.setLocalRecords(records)
      
      // 更新同步元数据
      this.syncMeta.lastSyncVersion = fullData.serverVersion
      this.syncMeta.lastSyncAt = new Date().toISOString()
      this.saveSyncMeta()

      // 清除待同步变更
      this.pendingChanges = { created: [], updated: [], deleted: [] }
      this.savePendingChanges()

      result.success = true
      result.pulled = records.length
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error'
    }

    return result
  }

  // 清除同步数据
  clearSyncData(): void {
    this.syncMeta = {
      lastSyncVersion: 0,
      lastSyncAt: null,
      serverUrl: null,
    }
    this.pendingChanges = { created: [], updated: [], deleted: [] }
    this.saveSyncMeta()
    this.savePendingChanges()
    apiClient.clearToken()
  }
}

export const syncService = new SyncService()
