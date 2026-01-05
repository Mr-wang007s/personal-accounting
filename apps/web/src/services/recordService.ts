/**
 * 记录服务 - 直接通过 API 操作
 * 重构：移除本地存储，所有数据直接通过 API 操作
 */

import type { Record, Statistics, DateRange, CategoryStat, MonthlyData } from '@personal-accounting/shared/types'
import { getCategoryById } from '@personal-accounting/shared/constants'
import { generateId, getNowISO, dayjs } from '@personal-accounting/shared/utils'
import { apiClient, CloudRecord } from './apiClient'

// 将云端记录转换为本地记录格式
function cloudToLocal(cloud: CloudRecord): Record {
  return {
    id: cloud.clientId,
    type: cloud.type,
    amount: cloud.amount,
    category: cloud.category,
    date: cloud.date,
    note: cloud.note,
    createdAt: cloud.createdAt,
    updatedAt: cloud.updatedAt,
    ledgerId: cloud.ledgerId,
    syncStatus: 'synced',
    serverId: cloud.serverId,
  }
}

class RecordService {
  private cache: Record[] = []
  private cacheTime: number = 0
  private readonly CACHE_TTL = 5000 // 5秒缓存

  /**
   * 刷新缓存
   */
  async refreshCache(): Promise<void> {
    try {
      const cloudRecords = await apiClient.getRecords()
      this.cache = cloudRecords.map(cloudToLocal)
      this.cacheTime = Date.now()
    } catch (error) {
      console.error('[RecordService] 刷新缓存失败:', error)
      throw error
    }
  }

  /**
   * 获取缓存的记录（如果过期则刷新）
   */
  private async getCache(): Promise<Record[]> {
    if (Date.now() - this.cacheTime > this.CACHE_TTL) {
      await this.refreshCache()
    }
    return this.cache
  }

  /**
   * 获取指定账本的记录
   */
  async getRecords(ledgerId: string): Promise<Record[]> {
    const records = await this.getCache()
    return records
      .filter(r => r.ledgerId === ledgerId)
      .sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf())
  }

  /**
   * 获取所有记录（不过滤账本）
   */
  async getAllRecords(): Promise<Record[]> {
    const records = await this.getCache()
    return records.sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf())
  }

  /**
   * 获取日期范围内的记录
   */
  async getRecordsByDateRange(ledgerId: string, dateRange: DateRange): Promise<Record[]> {
    const records = await this.getRecords(ledgerId)
    return records.filter(record => {
      return record.date >= dateRange.start && record.date <= dateRange.end
    })
  }

  /**
   * 添加记录
   */
  async addRecord(data: Omit<Record, 'id' | 'createdAt'>): Promise<Record> {
    const clientId = generateId()
    const now = getNowISO()

    try {
      const cloudRecord = await apiClient.createRecord({
        clientId,
        type: data.type,
        amount: data.amount,
        category: data.category,
        date: data.date,
        note: data.note,
        ledgerId: data.ledgerId!,
      })

      const newRecord = cloudToLocal(cloudRecord)
      
      // 更新缓存
      this.cache.unshift(newRecord)
      
      return newRecord
    } catch (error) {
      console.error('[RecordService] 添加记录失败:', error)
      throw error
    }
  }

  /**
   * 更新记录
   */
  async updateRecord(id: string, data: Partial<Record>): Promise<void> {
    try {
      await apiClient.updateRecord(id, {
        type: data.type,
        amount: data.amount,
        category: data.category,
        date: data.date,
        note: data.note,
      })

      // 更新缓存
      const index = this.cache.findIndex(r => r.id === id)
      if (index !== -1) {
        this.cache[index] = { ...this.cache[index], ...data, updatedAt: getNowISO() }
      }
    } catch (error) {
      console.error('[RecordService] 更新记录失败:', error)
      throw error
    }
  }

  /**
   * 删除记录
   */
  async deleteRecord(id: string): Promise<void> {
    try {
      await apiClient.deleteRecord(id)

      // 更新缓存
      this.cache = this.cache.filter(r => r.id !== id)
    } catch (error) {
      console.error('[RecordService] 删除记录失败:', error)
      throw error
    }
  }

  /**
   * 删除指定账本的所有记录
   */
  async deleteRecordsByLedger(ledgerId: string): Promise<void> {
    const records = this.cache.filter(r => r.ledgerId === ledgerId)
    const clientIds = records.map(r => r.id)
    
    if (clientIds.length > 0) {
      try {
        await apiClient.deleteRecords(clientIds)
        this.cache = this.cache.filter(r => r.ledgerId !== ledgerId)
      } catch (error) {
        console.error('[RecordService] 批量删除记录失败:', error)
        throw error
      }
    }
  }

  /**
   * 获取统计数据
   */
  async getStatistics(ledgerId: string, dateRange?: DateRange): Promise<Statistics> {
    const records = dateRange 
      ? await this.getRecordsByDateRange(ledgerId, dateRange) 
      : await this.getRecords(ledgerId)

    const totalIncome = records
      .filter(r => r.type === 'income')
      .reduce((sum, r) => sum + r.amount, 0)

    const totalExpense = records
      .filter(r => r.type === 'expense')
      .reduce((sum, r) => sum + r.amount, 0)

    const balance = totalIncome - totalExpense

    // Category breakdown for expenses
    const categoryMap = new Map<string, number>()
    records
      .filter(r => r.type === 'expense')
      .forEach(r => {
        const current = categoryMap.get(r.category) || 0
        categoryMap.set(r.category, current + r.amount)
      })

    const categoryBreakdown: CategoryStat[] = Array.from(categoryMap.entries())
      .map(([category, amount]) => {
        const cat = getCategoryById(category)
        return {
          category: cat?.name || category,
          amount,
          percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
          icon: cat?.icon || 'Circle',
        }
      })
      .sort((a, b) => b.amount - a.amount)

    // Monthly trend (last 6 months)
    const monthlyTrend: MonthlyData[] = []
    const now = dayjs()
    for (let i = 5; i >= 0; i--) {
      const date = now.subtract(i, 'month')
      const monthStr = date.format('YYYY-MM')
      const monthRecords = records.filter(r => r.date.startsWith(monthStr))
      
      monthlyTrend.push({
        month: `${date.month() + 1}月`,
        income: monthRecords
          .filter(r => r.type === 'income')
          .reduce((sum, r) => sum + r.amount, 0),
        expense: monthRecords
          .filter(r => r.type === 'expense')
          .reduce((sum, r) => sum + r.amount, 0),
      })
    }

    return {
      totalIncome,
      totalExpense,
      balance,
      categoryBreakdown,
      monthlyTrend,
    }
  }

  /**
   * 获取最近记录
   */
  async getRecentRecords(ledgerId: string, limit: number = 5): Promise<Record[]> {
    const records = await this.getRecords(ledgerId)
    return records.slice(0, limit)
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache = []
    this.cacheTime = 0
  }
}

export const recordService = new RecordService()
