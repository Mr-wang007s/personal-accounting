/**
 * 账本服务 - 账本管理相关操作
 * 所有操作直接通过 API 完成，数据来自云端
 */
import type { Ledger, UserProfile } from '../shared/types'
import { generateId, getNowISO } from '../shared/utils'
import { apiClient, CloudLedger, CreateLedgerRequest, UpdateLedgerRequest } from './apiClient'

/**
 * 转换云端账本数据
 */
function transformCloudLedger(cloudLedger: CloudLedger): Ledger {
  return {
    id: cloudLedger.id,
    name: cloudLedger.name,
    icon: cloudLedger.icon,
    color: cloudLedger.color,
    createdAt: cloudLedger.createdAt,
    updatedAt: cloudLedger.updatedAt,
  }
}

export const LedgerService = {
  /**
   * 创建新账本（直接调用 API）
   */
  async createLedger(name: string, icon?: string, color?: string): Promise<Ledger> {
    const clientId = generateId()

    const request: CreateLedgerRequest = {
      clientId,
      name,
      icon: icon || '📒',
      color,
    }

    const cloudLedger = await apiClient.createLedger(request)
    return transformCloudLedger(cloudLedger)
  },

  /**
   * 获取所有账本（从 API）
   */
  async getAllLedgers(): Promise<Ledger[]> {
    const cloudLedgers = await apiClient.getLedgers()
    return cloudLedgers.map(transformCloudLedger)
  },

  /**
   * 获取所有账本（从缓存的 globalData）
   */
  getLedgers(): Ledger[] {
    const app = getApp<IAppOption>()
    return app.globalData.ledgers || []
  },

  /**
   * 获取当前账本（从缓存的 globalData）
   */
  getCurrentLedger(): Ledger | null {
    const app = getApp<IAppOption>()
    return app.globalData.currentLedger || null
  },

  /**
   * 切换账本
   * 更新 globalData 中的当前账本
   */
  switchLedger(ledgerId: string): void {
    const app = getApp<IAppOption>()
    const ledgers = app.globalData.ledgers || []
    const ledger = ledgers.find((l) => l.id === ledgerId)
    
    if (ledger) {
      app.globalData.currentLedger = ledger
      if (app.globalData.userProfile) {
        app.globalData.userProfile.currentLedgerId = ledgerId
        app.globalData.userProfile.updatedAt = getNowISO()
      }
    }
  },

  /**
   * 删除账本（直接调用 API）
   */
  async deleteLedger(ledgerId: string): Promise<boolean> {
    const app = getApp<IAppOption>()
    const ledgers = app.globalData.ledgers || []
    
    if (ledgers.length <= 1) {
      return false // 至少保留一个账本
    }

    try {
      await apiClient.deleteLedger(ledgerId)
      
      // 更新 globalData
      const filtered = ledgers.filter((l) => l.id !== ledgerId)
      app.globalData.ledgers = filtered
      
      // 同时删除该账本的记录
      app.globalData.records = (app.globalData.records || []).filter(
        (r) => r.ledgerId !== ledgerId
      )
      
      // 如果删除的是当前账本，切换到第一个账本
      if (app.globalData.currentLedger?.id === ledgerId) {
        app.globalData.currentLedger = filtered[0]
        if (app.globalData.userProfile) {
          app.globalData.userProfile.currentLedgerId = filtered[0].id
          app.globalData.userProfile.updatedAt = getNowISO()
        }
      }
      
      return true
    } catch (error) {
      console.error('[LedgerService] 删除账本失败:', error)
      return false
    }
  },

  /**
   * 更新账本（直接调用 API）
   */
  async updateLedger(ledgerId: string, updates: Partial<Ledger>): Promise<void> {
    const request: UpdateLedgerRequest = {
      name: updates.name,
      icon: updates.icon,
      color: updates.color,
    }

    try {
      await apiClient.updateLedger(ledgerId, request)
      
      // 更新 globalData
      const app = getApp<IAppOption>()
      const ledgers = app.globalData.ledgers || []
      const index = ledgers.findIndex((l) => l.id === ledgerId)
      
      if (index !== -1) {
        ledgers[index] = {
          ...ledgers[index],
          ...updates,
          updatedAt: getNowISO(),
        }
        app.globalData.ledgers = ledgers
        
        // 如果更新的是当前账本，也更新 currentLedger
        if (app.globalData.currentLedger?.id === ledgerId) {
          app.globalData.currentLedger = ledgers[index]
        }
      }
    } catch (error) {
      console.error('[LedgerService] 更新账本失败:', error)
      throw error
    }
  },
}
