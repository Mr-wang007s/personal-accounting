import type { Record, Statistics, DateRange, CategoryStat, MonthlyData } from '@personal-accounting/shared/types'
import { STORAGE_KEY, getCategoryById } from '@personal-accounting/shared/constants'
import { generateId, getNowISO, dayjs } from '@personal-accounting/shared/utils'
import { ledgerService } from './ledgerService'

class StorageService {
  private getStorageData(): Record[] {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) return []
    return JSON.parse(data)
  }

  private setStorageData(records: Record[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  }

  /**
   * 获取当前账本的记录
   */
  getRecords(): Record[] {
    const currentLedger = ledgerService.getCurrentLedger()
    const allRecords = this.getStorageData()
    
    // 如果没有当前账本，返回所有无 ledgerId 的记录（兼容旧数据）
    if (!currentLedger) {
      return allRecords
        .filter(r => !r.ledgerId)
        .sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf())
    }
    
    return allRecords
      .filter(r => r.ledgerId === currentLedger.id || (!r.ledgerId && currentLedger))
      .sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf())
  }

  /**
   * 获取指定账本的记录
   */
  getRecordsByLedger(ledgerId: string): Record[] {
    return this.getStorageData()
      .filter(r => r.ledgerId === ledgerId)
      .sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf())
  }

  /**
   * 获取所有记录（不过滤账本）
   */
  getAllRecords(): Record[] {
    return this.getStorageData().sort(
      (a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf()
    )
  }

  getRecordsByDateRange(dateRange: DateRange): Record[] {
    const records = this.getRecords()
    const start = dateRange.start
    const end = dateRange.end
    return records.filter(record => {
      return record.date >= start && record.date <= end
    })
  }

  addRecord(data: Omit<Record, 'id' | 'createdAt'>): Record {
    const records = this.getStorageData()
    const currentLedger = ledgerService.getCurrentLedger()

    const newRecord: Record = {
      ...data,
      id: generateId(),
      createdAt: getNowISO(),
      ledgerId: data.ledgerId || currentLedger!.id,
    }
    records.push(newRecord)
    this.setStorageData(records)
    return newRecord
  }

  updateRecord(id: string, data: Partial<Record>): void {
    const records = this.getStorageData()
    const index = records.findIndex(r => r.id === id)
    if (index !== -1) {
      records[index] = { ...records[index], ...data }
      this.setStorageData(records)
    }
  }

  deleteRecord(id: string): void {
    const records = this.getStorageData()
    const filtered = records.filter(r => r.id !== id)
    this.setStorageData(filtered)
  }

  /**
   * 删除指定账本的所有记录
   */
  deleteRecordsByLedger(ledgerId: string): void {
    const records = this.getStorageData()
    const filtered = records.filter(r => r.ledgerId !== ledgerId)
    this.setStorageData(filtered)
  }

  /**
   * 迁移旧数据到指定账本
   */
  migrateOldRecords(ledgerId: string): number {
    const records = this.getStorageData()
    let migratedCount = 0
    
    const updated = records.map(r => {
      if (!r.ledgerId) {
        migratedCount++
        return { ...r, ledgerId }
      }
      return r
    })
    
    this.setStorageData(updated)
    return migratedCount
  }

  getStatistics(dateRange?: DateRange): Statistics {
    const records = dateRange 
      ? this.getRecordsByDateRange(dateRange) 
      : this.getRecords()

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

  getRecentRecords(limit: number = 5): Record[] {
    return this.getRecords().slice(0, limit)
  }

  /**
   * 清除当前账本数据
   */
  clearCurrentLedgerData(): void {
    const currentLedger = ledgerService.getCurrentLedger()
    if (currentLedger) {
      this.deleteRecordsByLedger(currentLedger.id)
    }
  }

  /**
   * 清除所有数据
   */
  clearAllData(): void {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export const storageService = new StorageService()
