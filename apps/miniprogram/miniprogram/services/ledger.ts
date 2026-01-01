/**
 * 账本服务 - 账本管理相关操作
 */
import type { Ledger, UserProfile } from '../shared/types'
import { generateId, getNowISO } from '../shared/utils'
import { StorageService } from './storage'
import { syncService } from './sync'

export const LedgerService = {
  /**
   * 初始化用户（首次使用）
   * 云托管模式下自动连接
   */
  async initializeUser(
    nickname: string, 
    ledgerName: string,
    _serverUrl?: string
  ): Promise<{ userProfile: UserProfile; ledger: Ledger; registered: boolean }> {
    const now = getNowISO()

    // 创建默认账本
    const ledger: Ledger = {
      id: generateId(),
      name: ledgerName,
      icon: '📒',
      createdAt: now,
      updatedAt: now,
    }

    // 创建用户配置
    const userProfile: UserProfile = {
      id: generateId(),
      nickname,
      currentLedgerId: ledger.id,
      createdAt: now,
      updatedAt: now,
    }

    // 保存到本地存储
    StorageService.saveLedgers([ledger])
    StorageService.saveUserProfile(userProfile)

    // 云托管模式下检查连接
    let registered = false
    try {
      const connected = await syncService.checkConnection()
      if (connected) {
        registered = true
        console.log('[LedgerService] 云托管连接成功')
      }
    } catch (error) {
      console.error('[LedgerService] 云托管连接检查失败:', error)
    }

    return { userProfile, ledger, registered }
  },

  /**
   * 创建新账本
   */
  createLedger(name: string, icon?: string): Ledger {
    const now = getNowISO()
    const ledger: Ledger = {
      id: generateId(),
      name,
      icon: icon || '📒',
      createdAt: now,
      updatedAt: now,
    }

    const ledgers = StorageService.getLedgers()
    ledgers.push(ledger)
    StorageService.saveLedgers(ledgers)

    return ledger
  },

  /**
   * 获取所有账本
   */
  getLedgers(): Ledger[] {
    return StorageService.getLedgers()
  },

  /**
   * 获取当前账本
   */
  getCurrentLedger(): Ledger | null {
    const profile = StorageService.getUserProfile()
    if (!profile) return null

    const ledgers = StorageService.getLedgers()
    return ledgers.find((l) => l.id === profile.currentLedgerId) || null
  },

  /**
   * 切换账本
   */
  switchLedger(ledgerId: string): void {
    const userProfile = StorageService.getUserProfile()
    if (userProfile) {
      userProfile.currentLedgerId = ledgerId
      userProfile.updatedAt = getNowISO()
      StorageService.saveUserProfile(userProfile)
    }
  },

  /**
   * 删除账本
   */
  async deleteLedger(ledgerId: string): Promise<boolean> {
    const ledgers = StorageService.getLedgers()
    if (ledgers.length <= 1) {
      return false // 至少保留一个账本
    }

    const filtered = ledgers.filter((l) => l.id !== ledgerId)
    StorageService.saveLedgers(filtered)

    // 清除该账本的记录
    StorageService.clearLedgerData(ledgerId)

    // 如果删除的是当前账本，切换到第一个账本
    const userProfile = StorageService.getUserProfile()
    if (userProfile && userProfile.currentLedgerId === ledgerId) {
      userProfile.currentLedgerId = filtered[0].id
      userProfile.updatedAt = getNowISO()
      StorageService.saveUserProfile(userProfile)
    }

    // 同步删除云端账本
    try {
      await syncService.deleteLedger(ledgerId)
    } catch (error) {
      console.error('[LedgerService] 删除云端账本失败:', error)
    }

    return true
  },

  /**
   * 更新账本
   */
  updateLedger(ledgerId: string, updates: Partial<Ledger>): void {
    const ledgers = StorageService.getLedgers()
    const index = ledgers.findIndex((l) => l.id === ledgerId)
    if (index !== -1) {
      ledgers[index] = {
        ...ledgers[index],
        ...updates,
        updatedAt: getNowISO(),
      }
      StorageService.saveLedgers(ledgers)
    }
  },
}
