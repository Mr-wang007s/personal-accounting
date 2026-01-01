/**
 * 账本服务 - 管理多账本数据
 */

import type { Ledger, UserProfile } from '@personal-accounting/shared/types'
import { LEDGERS_KEY, USER_PROFILE_KEY } from '@personal-accounting/shared/constants'
import { generateId, getNowISO } from '@personal-accounting/shared/utils'
import { syncService } from './syncService'

// 默认账本颜色
const DEFAULT_COLORS = [
  '#6366F1', // 紫色
  '#10B981', // 绿色
  '#F59E0B', // 橙色
  '#3B82F6', // 蓝色
  '#EC4899', // 粉色
  '#8B5CF6', // 浅紫
]

class LedgerService {
  // ==================== 用户配置 ====================

  getUserProfile(): UserProfile | null {
    const data = localStorage.getItem(USER_PROFILE_KEY)
    return data ? JSON.parse(data) : null
  }

  saveUserProfile(profile: UserProfile): void {
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile))
  }

  createUserProfile(nickname: string, phone?: string): UserProfile {
    const now = getNowISO()
    const profile: UserProfile = {
      id: generateId(),
      nickname,
      currentLedgerId: '',
      createdAt: now,
      updatedAt: now,
      phone,
    }
    this.saveUserProfile(profile)
    return profile
  }

  updateUserProfile(data: Partial<UserProfile>): UserProfile | null {
    const profile = this.getUserProfile()
    if (!profile) return null
    
    const updated = {
      ...profile,
      ...data,
      updatedAt: getNowISO(),
    }
    this.saveUserProfile(updated)
    return updated
  }

  // ==================== 账本管理 ====================

  getLedgers(): Ledger[] {
    const data = localStorage.getItem(LEDGERS_KEY)
    return data ? JSON.parse(data) : []
  }

  saveLedgers(ledgers: Ledger[]): void {
    localStorage.setItem(LEDGERS_KEY, JSON.stringify(ledgers))
  }

  getLedger(id: string): Ledger | undefined {
    return this.getLedgers().find(l => l.id === id)
  }

  createLedger(name: string, icon?: string, color?: string): Ledger {
    const ledgers = this.getLedgers()
    const now = getNowISO()
    
    const newLedger: Ledger = {
      id: generateId(),
      name,
      icon: icon || 'Book',
      color: color || DEFAULT_COLORS[ledgers.length % DEFAULT_COLORS.length],
      createdAt: now,
      updatedAt: now,
    }
    
    ledgers.push(newLedger)
    this.saveLedgers(ledgers)
    
    return newLedger
  }

  updateLedger(id: string, data: Partial<Omit<Ledger, 'id' | 'createdAt'>>): Ledger | null {
    const ledgers = this.getLedgers()
    const index = ledgers.findIndex(l => l.id === id)
    
    if (index === -1) return null
    
    ledgers[index] = {
      ...ledgers[index],
      ...data,
      updatedAt: getNowISO(),
    }
    
    this.saveLedgers(ledgers)
    return ledgers[index]
  }

  async deleteLedger(id: string): Promise<boolean> {
    const ledgers = this.getLedgers()
    const filtered = ledgers.filter(l => l.id !== id)
    
    if (filtered.length === ledgers.length) return false
    
    this.saveLedgers(filtered)

    // 同步删除云端账本
    try {
      await syncService.deleteLedger(id)
    } catch (error) {
      console.error('[LedgerService] 删除云端账本失败:', error)
    }

    return true
  }

  // ==================== 初始化检查 ====================

  isInitialized(): boolean {
    const profile = this.getUserProfile()
    const ledgers = this.getLedgers()
    return !!profile && ledgers.length > 0 && !!profile.currentLedgerId
  }

  /**
   * 初始化用户和默认账本
   */
  initialize(nickname: string, ledgerName: string = '我的账本', phone?: string): { profile: UserProfile; ledger: Ledger } {
    // 创建用户
    const profile = this.createUserProfile(nickname, phone)
    
    // 创建默认账本
    const ledger = this.createLedger(ledgerName)
    
    // 设置当前账本
    profile.currentLedgerId = ledger.id
    this.saveUserProfile(profile)
    
    return { profile, ledger }
  }

  /**
   * 切换当前账本
   */
  switchLedger(ledgerId: string): boolean {
    const ledger = this.getLedger(ledgerId)
    if (!ledger) return false
    
    this.updateUserProfile({ currentLedgerId: ledgerId })
    return true
  }

  /**
   * 更新手机号（便于直接存储到 pa_user_profile）
   */
  updatePhone(phone: string): UserProfile | null {
    return this.updateUserProfile({ phone })
  }

  /**
   * 获取当前账本
   */
  getCurrentLedger(): Ledger | null {
    const profile = this.getUserProfile()
    if (!profile?.currentLedgerId) return null
    return this.getLedger(profile.currentLedgerId) || null
  }

  /**
   * 清除所有数据
   */
  clearAllData(): void {
    localStorage.removeItem(USER_PROFILE_KEY)
    localStorage.removeItem(LEDGERS_KEY)
  }
}

export const ledgerService = new LedgerService()
