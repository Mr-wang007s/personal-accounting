/**
 * 账本服务 - 账本管理相关操作
 */
import type { Ledger, UserProfile } from '../shared/types'
import { generateId, getNowISO } from '../shared/utils'
import { StorageService } from './storage'

export const LedgerService = {
  /**
   * 初始化用户（首次使用）
   */
  initializeUser(nickname: string, ledgerName: string): { userProfile: UserProfile; ledger: Ledger } {
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

    // 保存到存储
    StorageService.saveLedgers([ledger])
    StorageService.saveUserProfile(userProfile)

    return { userProfile, ledger }
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
  deleteLedger(ledgerId: string): boolean {
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
