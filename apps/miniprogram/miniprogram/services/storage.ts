/**
 * 存储服务 - 封装微信小程序本地存储 API
 */
import type { Record, Ledger, UserProfile } from '../shared/types'
import { STORAGE_KEY, LEDGERS_KEY, USER_PROFILE_KEY } from '../shared/constants'

export const StorageService = {
  // ========== 记录相关 ==========

  /**
   * 获取所有记录
   */
  getRecords(): Record[] {
    try {
      return wx.getStorageSync(STORAGE_KEY) || []
    } catch {
      return []
    }
  },

  /**
   * 保存所有记录
   */
  saveRecords(records: Record[]): void {
    wx.setStorageSync(STORAGE_KEY, records)
  },

  /**
   * 添加记录
   */
  addRecord(record: Record): void {
    const records = this.getRecords()
    records.unshift(record)
    this.saveRecords(records)
  },

  /**
   * 更新记录
   */
  updateRecord(id: string, updates: Partial<Record>): void {
    const records = this.getRecords()
    const index = records.findIndex((r) => r.id === id)
    if (index !== -1) {
      records[index] = { ...records[index], ...updates }
      this.saveRecords(records)
    }
  },

  /**
   * 删除记录
   */
  deleteRecord(id: string): void {
    const records = this.getRecords()
    const filtered = records.filter((r) => r.id !== id)
    this.saveRecords(filtered)
  },

  // ========== 账本相关 ==========

  /**
   * 获取所有账本
   */
  getLedgers(): Ledger[] {
    try {
      return wx.getStorageSync(LEDGERS_KEY) || []
    } catch {
      return []
    }
  },

  /**
   * 保存所有账本
   */
  saveLedgers(ledgers: Ledger[]): void {
    wx.setStorageSync(LEDGERS_KEY, ledgers)
  },

  // ========== 用户配置相关 ==========

  /**
   * 获取用户配置
   */
  getUserProfile(): UserProfile | null {
    try {
      return wx.getStorageSync(USER_PROFILE_KEY) || null
    } catch {
      return null
    }
  },

  /**
   * 保存用户配置
   */
  saveUserProfile(profile: UserProfile): void {
    wx.setStorageSync(USER_PROFILE_KEY, profile)
  },

  // ========== 数据清理 ==========

  /**
   * 清除指定账本的数据
   */
  clearLedgerData(ledgerId: string): void {
    const records = this.getRecords()
    const filtered = records.filter((r) => r.ledgerId !== ledgerId)
    this.saveRecords(filtered)
  },

  /**
   * 清除所有数据
   */
  clearAllData(): void {
    wx.removeStorageSync(STORAGE_KEY)
    wx.removeStorageSync(LEDGERS_KEY)
    wx.removeStorageSync(USER_PROFILE_KEY)
  },

  /**
   * 检查是否首次使用
   */
  isFirstTime(): boolean {
    const profile = this.getUserProfile()
    return !profile
  },
}
