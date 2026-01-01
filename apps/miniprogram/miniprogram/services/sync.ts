/**
 * 同步服务 - 微信云托管版本
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

import { apiClient, BackupRecord, BackupLedger } from './apiClient'
import type { Record, Ledger, SyncStatus } from '../shared/types'
import { STORAGE_KEY, LEDGERS_KEY, USER_PROFILE_KEY } from '../shared/constants'

// 存储键
const SYNC_META_KEY = 'pa_sync_meta'

interface SyncMeta {
  serverUrl: string | null  // 云托管模式下为 'cloudrun' 标识
  lastSyncAt: string | null
  autoSync: boolean
  userPhone: string | null // 保存登录的手机号（兼容旧版）
  openid: string | null // 微信 openid
}

export type SyncState = 'idle' | 'syncing' | 'success' | 'error' | 'offline'

export interface SyncResult {
  success: boolean
  uploaded: number   // 上传到云端的数量
  downloaded: number // 从云端下载的数量
  ledgersUploaded?: number // 上传的账本数量
  ledgersDownloaded?: number // 下载的账本数量
  error?: string
}

class SyncService {
  private syncMeta: SyncMeta
  private syncState: SyncState = 'idle'
  private syncTimer: number | null = null

  constructor() {
    this.syncMeta = this.loadSyncMeta()
    // 云托管模式下自动标记为已连接
    if (!this.syncMeta.serverUrl) {
      this.syncMeta.serverUrl = 'cloudrun'
      this.saveSyncMeta()
    }
  }

  private loadSyncMeta(): SyncMeta {
    try {
      const data = wx.getStorageSync(SYNC_META_KEY)
      return data || { serverUrl: null, lastSyncAt: null, autoSync: true, userPhone: null, openid: null }
    } catch {
      return { serverUrl: null, lastSyncAt: null, autoSync: true, userPhone: null, openid: null }
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

  private getLocalLedgers(): Ledger[] {
    try {
      return wx.getStorageSync(LEDGERS_KEY) || []
    } catch {
      return []
    }
  }

  private setLocalLedgers(ledgers: Ledger[]): void {
    wx.setStorageSync(LEDGERS_KEY, ledgers)
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

  /**
   * 发现服务器 - 云托管模式下直接返回成功
   */
  async discoverServer(_url?: string): Promise<boolean> {
    try {
      // 云托管模式下，通过 ping 检查服务是否可用
      await apiClient.ping()
      this.syncMeta.serverUrl = 'cloudrun'
      this.saveSyncMeta()
      return true
    } catch {
      return false
    }
  }

  /**
   * 检查连接 - 云托管模式
   */
  async checkConnection(): Promise<boolean> {
    try {
      await apiClient.ping()
      return true
    } catch {
      return false
    }
  }

  /**
   * 获取微信登录 code
   * @returns Promise<string> 登录凭证 code
   */
  private getWxLoginCode(): Promise<string> {
    return new Promise((resolve, reject) => {
      wx.login({
        success: (res) => {
          if (res.code) {
            resolve(res.code)
          } else {
            reject(new Error('获取登录凭证失败'))
          }
        },
        fail: (err) => {
          reject(new Error(err.errMsg || '微信登录失败'))
        },
      })
    })
  }

  /**
   * 检查微信 session 是否有效
   * @returns Promise<boolean>
   */
  private checkWxSession(): Promise<boolean> {
    return new Promise((resolve) => {
      wx.checkSession({
        success: () => resolve(true),
        fail: () => resolve(false),
      })
    })
  }

  /**
   * 微信云托管自动登录
   * 登录流程：
   * 1. 先尝试云托管自动注入的 openid
   * 2. 如果失败，调用 wx.login 获取 code，通过 code2Session 换取 openid
   * @param nickname 用户昵称（可选，从微信获取）
   * @param avatar 用户头像（可选，从微信获取）
   * @returns 登录结果，包含用户信息
   */
  async autoLogin(nickname?: string, avatar?: string): Promise<{ success: boolean; user?: { id: string; phone: string; nickname?: string; avatar?: string; openid?: string }; isNewUser?: boolean }> {
    try {
      // 先尝试不带 code 登录（依赖云托管自动注入 openid）
      let result = await apiClient.wxCloudLogin(nickname, avatar)
      apiClient.setToken(result.accessToken)
      
      // 保存用户信息
      this.syncMeta.openid = result.user.openid || null
      this.syncMeta.userPhone = result.user.phone || null
      this.saveSyncMeta()

      // 将用户信息保存到用户配置（pa_user_profile）
      this.saveUserProfileToStorage(result.user)

      return { success: true, user: result.user, isNewUser: result.isNewUser }
    } catch (error) {
      console.warn('[Sync] 云托管自动登录失败，尝试使用 wx.login:', error)
      
      // 云托管未注入 openid，使用 wx.login 获取 code
      try {
        const code = await this.getWxLoginCode()
        const result = await apiClient.wxCloudLogin(nickname, avatar, code)
        apiClient.setToken(result.accessToken)
        
        // 保存用户信息
        this.syncMeta.openid = result.user.openid || null
        this.syncMeta.userPhone = result.user.phone || null
        this.saveSyncMeta()

        // 将用户信息保存到用户配置
        this.saveUserProfileToStorage(result.user)

        return { success: true, user: result.user, isNewUser: result.isNewUser }
      } catch (loginError) {
        console.error('[Sync] wx.login 登录失败:', loginError)
        return { success: false }
      }
    }
  }

  /**
   * 保存用户信息到本地存储
   */
  private saveUserProfileToStorage(user: { phone?: string; nickname?: string; avatar?: string }): void {
    try {
      const existingProfile = wx.getStorageSync(USER_PROFILE_KEY)
      if (existingProfile) {
        if (user.phone) {
          existingProfile.phone = user.phone
        }
        if (user.nickname) {
          existingProfile.nickname = user.nickname
        }
        if (user.avatar) {
          existingProfile.avatar = user.avatar
        }
        existingProfile.updatedAt = new Date().toISOString()
        wx.setStorageSync(USER_PROFILE_KEY, existingProfile)
      }
    } catch (e) {
      console.error('[Sync] 保存用户信息到配置失败:', e)
    }
  }

  /**
   * 手机号登录（保留兼容）
   * @returns 登录结果，包含是否为新用户
   */
  async login(phone: string, nickname?: string): Promise<{ success: boolean; isNewUser: boolean }> {
    try {
      const result = await apiClient.phoneLogin(phone, nickname)
      apiClient.setToken(result.accessToken)
      this.syncMeta.userPhone = phone
      this.saveSyncMeta()

      // 将手机号保存到用户配置（pa_user_profile）
      try {
        const existingProfile = wx.getStorageSync(USER_PROFILE_KEY)
        if (existingProfile) {
          existingProfile.phone = phone
          existingProfile.updatedAt = new Date().toISOString()
          wx.setStorageSync(USER_PROFILE_KEY, existingProfile)
        }
      } catch (e) {
        console.error('[Sync] 保存手机号到用户配置失败:', e)
      }

      return { success: true, isNewUser: result.isNewUser }
    } catch {
      return { success: false, isNewUser: false }
    }
  }

  disconnect(): void {
    this.syncMeta = { serverUrl: 'cloudrun', lastSyncAt: null, autoSync: true, userPhone: null, openid: null }
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

  // ==================== 账本同步 ====================

  /**
   * 同步本地账本到云端
   */
  async syncLedgers(): Promise<{ uploaded: number; downloaded: number }> {
    if (!this.isConnected()) {
      return { uploaded: 0, downloaded: 0 }
    }

    const localLedgers = this.getLocalLedgers()
    let uploaded = 0
    let downloaded = 0

    // 先从云端获取已有账本
    let cloudLedgers: { clientId: string; name: string; icon?: string; color?: string; createdAt: string; updatedAt: string }[] = []
    try {
      const restoreResult = await apiClient.restore()
      cloudLedgers = restoreResult.ledgers || []
    } catch (error) {
      console.error('[Sync] 获取云端账本失败:', error)
    }

    // 创建云端账本名称集合，用于检查是否已存在
    const cloudLedgerNames = new Set(cloudLedgers.map(l => l.name))
    const cloudLedgerClientIds = new Set(cloudLedgers.map(l => l.clientId))

    // 上传本地账本（仅上传云端不存在的）
    if (localLedgers.length > 0) {
      // 过滤出云端不存在的账本（按 clientId 或 name 判断）
      const newLedgers = localLedgers.filter(l => 
        !cloudLedgerClientIds.has(l.id) && !cloudLedgerNames.has(l.name)
      )

      if (newLedgers.length > 0) {
        const backupLedgers: BackupLedger[] = newLedgers.map(l => ({
          clientId: l.id,
          name: l.name,
          icon: l.icon,
          color: l.color,
          createdAt: l.createdAt,
        }))

        try {
          const result = await apiClient.backupLedgers(backupLedgers)
          uploaded = result.uploaded
        } catch (error) {
          console.error('[Sync] 账本上传失败:', error)
        }
      }
    }

    // 从云端下载本地没有的账本
    const localLedgerMap = new Map(localLedgers.map(l => [l.id, l]))
    const localLedgerNames = new Set(localLedgers.map(l => l.name))

    for (const cloudLedger of cloudLedgers) {
      // 按 clientId 或 name 判断本地是否已存在
      if (!localLedgerMap.has(cloudLedger.clientId) && !localLedgerNames.has(cloudLedger.name)) {
        // 云端有，本地没有 -> 下载到本地
        const newLedger: Ledger = {
          id: cloudLedger.clientId,
          name: cloudLedger.name,
          icon: cloudLedger.icon,
          color: cloudLedger.color,
          createdAt: cloudLedger.createdAt,
          updatedAt: cloudLedger.updatedAt,
        }
        localLedgerMap.set(newLedger.id, newLedger)
        downloaded++
      }
    }

    this.setLocalLedgers(Array.from(localLedgerMap.values()))

    return { uploaded, downloaded }
  }

  /**
   * 同步单个新账本到云端
   */
  async syncNewLedger(ledger: Ledger): Promise<boolean> {
    if (!this.isConnected()) {
      return false
    }

    try {
      const backupLedger: BackupLedger = {
        clientId: ledger.id,
        name: ledger.name,
        icon: ledger.icon,
        color: ledger.color,
        createdAt: ledger.createdAt,
      }

      const result = await apiClient.backupLedgers([backupLedger])
      return result.success
    } catch (error) {
      console.error('[Sync] 账本同步失败:', error)
      return false
    }
  }

  // ==================== 同步操作 ====================

  /**
   * 自动同步（联网时调用）
   * 1. 先同步账本
   * 2. 上传本地未同步的记录到云端
   * 3. 下载云端有而本地没有的记录
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
      // 1. 先同步账本
      const ledgerResult = await this.syncLedgers()
      result.ledgersUploaded = ledgerResult.uploaded
      result.ledgersDownloaded = ledgerResult.downloaded

      const localRecords = this.getLocalRecords()
      const localMap = new Map(localRecords.map(r => [r.id, r]))

      // 2. 上传本地未同步的记录
      const toBackup = localRecords.filter(r => r.syncStatus !== 'synced')
      if (toBackup.length > 0) {
        // 获取当前账本 ID，用于填充没有 ledgerId 的旧记录
        let defaultLedgerId = ''
        try {
          const userProfile = wx.getStorageSync(USER_PROFILE_KEY)
          defaultLedgerId = userProfile?.currentLedgerId || ''
        } catch {
          // ignore
        }
        
        // 过滤掉没有 ledgerId 且没有默认账本的记录
        const validRecords = toBackup.filter(r => r.ledgerId || defaultLedgerId)
        
        if (validRecords.length > 0) {
          const backupRecords: BackupRecord[] = validRecords.map(r => ({
            clientId: r.id,
            type: r.type,
            amount: r.amount,
            category: r.category,
            date: r.date,
            note: r.note,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
            ledgerId: r.ledgerId || defaultLedgerId,
          }))

          const backupResult = await apiClient.backup(backupRecords)
          result.uploaded = backupResult.uploaded

          // 更新本地记录的同步状态
          for (const item of backupResult.records) {
            const record = localMap.get(item.clientId)
            if (record) {
              record.syncStatus = 'synced'
              record.serverId = item.serverId
              // 同时更新 ledgerId（如果之前没有）
              if (!record.ledgerId && defaultLedgerId) {
                record.ledgerId = defaultLedgerId
              }
            }
          }
        }
      }

      // 3. 从云端下载记录
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
