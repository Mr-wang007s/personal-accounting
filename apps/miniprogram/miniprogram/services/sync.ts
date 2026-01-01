/**
 * 同步服务 - 简化版（OneDrive/iCloud 模式）
 * 
 * 核心逻辑：
 * 1. 每条数据标记 syncStatus: 'local' | 'synced'
 * 2. 联网时自动备份本地数据到云端
 * 3. 联网时自动下载云端数据到本地
 * 4. 删除已同步数据时，提示是否删除云端
 */

// 小程序环境的全局定时器声明
declare function setTimeout(callback: () => void, ms: number): number
declare function clearTimeout(id: number): void

import { apiClient, BackupRecord } from './apiClient'
import type { Record, SyncStatus } from '../shared/types'
import { STORAGE_KEY } from '../shared/constants'

// 存储键
const SYNC_META_KEY = 'pa_sync_meta'

interface SyncMeta {
  serverUrl: string | null
  lastSyncAt: string | null
  autoSync: boolean
}

export type SyncState = 'idle' | 'syncing' | 'success' | 'error' | 'offline'

export interface SyncResult {
  success: boolean
  uploaded: number   // 上传到云端的数量
  downloaded: number // 从云端下载的数量
  error?: string
}

class SyncService {
  private syncMeta: SyncMeta
  private syncState: SyncState = 'idle'
  private syncTimer: number | null = null

  constructor() {
    this.syncMeta = this.loadSyncMeta()
    // 恢复服务器地址
    if (this.syncMeta.serverUrl) {
      apiClient.setBaseUrl(this.syncMeta.serverUrl)
    }
  }

  private loadSyncMeta(): SyncMeta {
    try {
      const data = wx.getStorageSync(SYNC_META_KEY)
      return data || { serverUrl: null, lastSyncAt: null, autoSync: true }
    } catch {
      return { serverUrl: null, lastSyncAt: null, autoSync: true }
    }
  }

  private saveSyncMeta(): void {
    wx.setStorageSync(SYNC_META_KEY, this.syncMeta)
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

  // ==================== 公共方法 ====================

  getSyncMeta(): SyncMeta {
    return { ...this.syncMeta }
  }

  getSyncState(): SyncState {
    return this.syncState
  }

  isConnected(): boolean {
    return this.syncMeta.serverUrl !== null && apiClient.isAuthenticated()
  }

  setAutoSync(enabled: boolean): void {
    this.syncMeta.autoSync = enabled
    this.saveSyncMeta()
  }

  isAutoSyncEnabled(): boolean {
    return this.syncMeta.autoSync
  }

  /**
   * 获取待备份的记录数量（本地未同步的）
   */
  getPendingBackupCount(): number {
    const records = this.getLocalRecords()
    return records.filter(r => r.syncStatus !== 'synced').length
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

  async login(identifier: string, nickname?: string): Promise<boolean> {
    try {
      const result = await apiClient.devLogin(identifier, nickname)
      apiClient.setToken(result.accessToken)
      return true
    } catch {
      return false
    }
  }

  disconnect(): void {
    this.syncMeta = { serverUrl: null, lastSyncAt: null, autoSync: true }
    this.saveSyncMeta()
    apiClient.clearToken()
    
    // 将所有记录标记为本地
    const records = this.getLocalRecords()
    const updatedRecords = records.map(r => ({
      ...r,
      syncStatus: 'local' as SyncStatus,
      serverId: undefined,
    }))
    this.setLocalRecords(updatedRecords)
  }

  // ==================== 同步操作 ====================

  /**
   * 自动同步（联网时调用）
   * 1. 上传本地未同步的数据到云端
   * 2. 下载云端有而本地没有的数据
   */
  async sync(): Promise<SyncResult> {
    if (!this.isConnected()) {
      return { success: false, uploaded: 0, downloaded: 0, error: '未连接服务器' }
    }

    if (this.syncState === 'syncing') {
      return { success: false, uploaded: 0, downloaded: 0, error: '同步进行中' }
    }

    this.syncState = 'syncing'
    const result: SyncResult = { success: false, uploaded: 0, downloaded: 0 }

    try {
      const localRecords = this.getLocalRecords()
      const localMap = new Map(localRecords.map(r => [r.id, r]))

      // 1. 上传本地未同步的记录
      const toBackup = localRecords.filter(r => r.syncStatus !== 'synced')
      if (toBackup.length > 0) {
        const backupRecords: BackupRecord[] = toBackup.map(r => ({
          clientId: r.id,
          type: r.type,
          amount: r.amount,
          category: r.category,
          date: r.date,
          note: r.note,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          ledgerId: r.ledgerId,
        }))

        const backupResult = await apiClient.backup(backupRecords)
        result.uploaded = backupResult.uploaded

        // 更新本地记录的同步状态
        for (const item of backupResult.records) {
          const record = localMap.get(item.clientId)
          if (record) {
            record.syncStatus = 'synced'
            record.serverId = item.serverId
          }
        }
      }

      // 2. 从云端下载记录
      const restoreResult = await apiClient.restore()
      const cloudRecords = restoreResult.records

      // 合并云端记录到本地
      for (const cloudRecord of cloudRecords) {
        const localRecord = localMap.get(cloudRecord.clientId)
        
        if (!localRecord) {
          // 云端有，本地没有 -> 下载到本地
          const newRecord: Record = {
            id: cloudRecord.clientId,
            type: cloudRecord.type,
            amount: cloudRecord.amount,
            category: cloudRecord.category,
            date: cloudRecord.date,
            note: cloudRecord.note,
            createdAt: cloudRecord.createdAt,
            updatedAt: cloudRecord.updatedAt,
            ledgerId: cloudRecord.ledgerId,
            syncStatus: 'synced',
            serverId: cloudRecord.serverId,
          }
          localMap.set(newRecord.id, newRecord)
          result.downloaded++
        } else if (!localRecord.serverId) {
          // 本地有但没有 serverId，更新 serverId
          localRecord.serverId = cloudRecord.serverId
          localRecord.syncStatus = 'synced'
        }
      }

      // 保存合并后的记录
      this.setLocalRecords(Array.from(localMap.values()))

      // 更新同步元数据
      this.syncMeta.lastSyncAt = new Date().toISOString()
      this.saveSyncMeta()

      result.success = true
      this.syncState = 'success'
    } catch (error) {
      result.error = error instanceof Error ? error.message : '同步失败'
      this.syncState = 'error'
    }

    // 3秒后重置状态
    setTimeout(() => {
      if (this.syncState !== 'syncing') {
        this.syncState = 'idle'
      }
    }, 3000)

    return result
  }

  /**
   * 删除记录（带云端删除确认）
   * @param id 记录 ID
   * @param deleteFromCloud 是否同时删除云端
   */
  async deleteRecord(id: string, deleteFromCloud: boolean = false): Promise<boolean> {
    const records = this.getLocalRecords()
    const record = records.find(r => r.id === id)
    
    if (!record) return false

    // 如果需要删除云端且有 serverId
    if (deleteFromCloud && record.serverId && this.isConnected()) {
      try {
        await apiClient.deleteCloudRecords([record.serverId])
      } catch (error) {
        console.error('[Sync] 删除云端记录失败:', error)
        // 继续删除本地记录
      }
    }

    // 删除本地记录
    const updatedRecords = records.filter(r => r.id !== id)
    this.setLocalRecords(updatedRecords)
    
    return true
  }

  /**
   * 检查记录是否已同步到云端
   */
  isRecordSynced(id: string): boolean {
    const records = this.getLocalRecords()
    const record = records.find(r => r.id === id)
    return record?.syncStatus === 'synced'
  }

  /**
   * 标记记录需要重新同步（编辑后调用）
   */
  markRecordForSync(id: string): void {
    const records = this.getLocalRecords()
    const record = records.find(r => r.id === id)
    if (record && record.syncStatus === 'synced') {
      record.syncStatus = 'local'
      record.updatedAt = new Date().toISOString()
      this.setLocalRecords(records)
    }
  }

  /**
   * 触发自动同步（数据变更后调用）
   */
  triggerAutoSync(): void {
    if (!this.syncMeta.autoSync || !this.isConnected()) return

    // 防抖：3秒内只触发一次
    if (this.syncTimer) {
      clearTimeout(this.syncTimer)
    }
    this.syncTimer = setTimeout(() => {
      this.sync()
      this.syncTimer = null
    }, 3000) as unknown as number
  }
}

export const syncService = new SyncService()
