/**
 * 账本服务 - 直接通过 API 操作
 * 重构：移除本地存储，所有数据直接通过 API 操作
 */

import type { Ledger, UserProfile } from '@personal-accounting/shared/types'
import { generateId, getNowISO } from '@personal-accounting/shared/utils'
import { apiClient, CloudLedger } from './apiClient'

// 用户配置存储键（仅保留必要的本地状态）
const USER_PROFILE_KEY = 'pa_user_profile'
const CURRENT_LEDGER_KEY = 'pa_current_ledger_id'

// 默认账本颜色
const DEFAULT_COLORS = [
  '#6366F1', // 紫色
  '#10B981', // 绿色
  '#F59E0B', // 橙色
  '#3B82F6', // 蓝色
  '#EC4899', // 粉色
  '#8B5CF6', // 浅紫
]

// 将云端账本转换为本地账本格式
function cloudToLocal(cloud: CloudLedger): Ledger {
  return {
    id: cloud.clientId,
    name: cloud.name,
    icon: cloud.icon,
    color: cloud.color,
    createdAt: cloud.createdAt,
    updatedAt: cloud.updatedAt,
  }
}

class LedgerService {
  private cache: Ledger[] = []
  private cacheTime: number = 0
  private readonly CACHE_TTL = 5000 // 5秒缓存

  // ==================== 用户配置（本地存储，非业务数据） ====================

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

  // ==================== 当前账本 ID（本地存储） ====================

  getCurrentLedgerId(): string | null {
    return localStorage.getItem(CURRENT_LEDGER_KEY)
  }

  setCurrentLedgerId(id: string): void {
    localStorage.setItem(CURRENT_LEDGER_KEY, id)
    // 同步更新 userProfile
    this.updateUserProfile({ currentLedgerId: id })
  }

  // ==================== 账本管理（API 操作） ====================

  /**
   * 刷新缓存
   */
  async refreshCache(): Promise<void> {
    try {
      const cloudLedgers = await apiClient.getLedgers()
      this.cache = cloudLedgers.map(cloudToLocal)
      this.cacheTime = Date.now()
    } catch (error) {
      console.error('[LedgerService] 刷新缓存失败:', error)
      throw error
    }
  }

  /**
   * 获取缓存的账本（如果过期则刷新）
   */
  private async getCache(): Promise<Ledger[]> {
    if (Date.now() - this.cacheTime > this.CACHE_TTL) {
      await this.refreshCache()
    }
    return this.cache
  }

  /**
   * 获取所有账本
   */
  async getLedgers(): Promise<Ledger[]> {
    return this.getCache()
  }

  /**
   * 获取指定账本
   */
  async getLedger(id: string): Promise<Ledger | undefined> {
    const ledgers = await this.getCache()
    return ledgers.find(l => l.id === id)
  }

  /**
   * 创建账本
   */
  async createLedger(name: string, icon?: string, color?: string): Promise<Ledger> {
    const clientId = generateId()
    const ledgers = await this.getCache()

    try {
      const cloudLedger = await apiClient.createLedger({
        clientId,
        name,
        icon: icon || 'Book',
        color: color || DEFAULT_COLORS[ledgers.length % DEFAULT_COLORS.length],
      })

      const newLedger = cloudToLocal(cloudLedger)
      
      // 更新缓存
      this.cache.push(newLedger)
      
      return newLedger
    } catch (error) {
      console.error('[LedgerService] 创建账本失败:', error)
      throw error
    }
  }

  /**
   * 更新账本
   */
  async updateLedger(id: string, data: Partial<Omit<Ledger, 'id' | 'createdAt'>>): Promise<Ledger | null> {
    try {
      const cloudLedger = await apiClient.updateLedger(id, {
        name: data.name,
        icon: data.icon,
        color: data.color,
      })

      const updatedLedger = cloudToLocal(cloudLedger)
      
      // 更新缓存
      const index = this.cache.findIndex(l => l.id === id)
      if (index !== -1) {
        this.cache[index] = updatedLedger
      }
      
      return updatedLedger
    } catch (error) {
      console.error('[LedgerService] 更新账本失败:', error)
      throw error
    }
  }

  /**
   * 删除账本
   */
  async deleteLedger(id: string): Promise<boolean> {
    try {
      await apiClient.deleteLedger(id)
      
      // 更新缓存
      this.cache = this.cache.filter(l => l.id !== id)
      
      return true
    } catch (error) {
      console.error('[LedgerService] 删除账本失败:', error)
      return false
    }
  }

  // ==================== 初始化检查 ====================

  isInitialized(): boolean {
    const profile = this.getUserProfile()
    const currentLedgerId = this.getCurrentLedgerId()
    return !!profile && !!currentLedgerId
  }

  /**
   * 初始化用户和默认账本
   */
  async initialize(nickname: string, ledgerName: string = '我的账本', phone?: string): Promise<{ profile: UserProfile; ledger: Ledger }> {
    // 创建用户
    const profile = this.createUserProfile(nickname, phone)
    
    // 创建默认账本
    const ledger = await this.createLedger(ledgerName)
    
    // 设置当前账本
    this.setCurrentLedgerId(ledger.id)
    profile.currentLedgerId = ledger.id
    this.saveUserProfile(profile)
    
    return { profile, ledger }
  }

  /**
   * 切换当前账本
   */
  switchLedger(ledgerId: string): boolean {
    this.setCurrentLedgerId(ledgerId)
    return true
  }

  /**
   * 获取当前账本
   */
  async getCurrentLedger(): Promise<Ledger | null> {
    const currentId = this.getCurrentLedgerId()
    if (!currentId) return null
    return await this.getLedger(currentId) || null
  }

  /**
   * 清除所有本地数据
   */
  clearAllData(): void {
    localStorage.removeItem(USER_PROFILE_KEY)
    localStorage.removeItem(CURRENT_LEDGER_KEY)
    this.cache = []
    this.cacheTime = 0
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache = []
    this.cacheTime = 0
  }
}

export const ledgerService = new LedgerService()
