import { Record, Statistics, DateRange, CategoryStat, MonthlyData } from '@/types'
import { STORAGE_KEY, getCategoryById } from '@/lib/constants'
import { generateId } from '@/lib/utils'

class StorageService {
  private getStorageData(): Record[] {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) return []
    return JSON.parse(data)
  }

  private setStorageData(records: Record[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  }

  getRecords(): Record[] {
    return this.getStorageData().sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }

  getRecordsByDateRange(dateRange: DateRange): Record[] {
    const records = this.getRecords()
    return records.filter(record => {
      const recordDate = new Date(record.date)
      const startDate = new Date(dateRange.start)
      const endDate = new Date(dateRange.end)
      return recordDate >= startDate && recordDate <= endDate
    })
  }

  addRecord(data: Omit<Record, 'id' | 'createdAt'>): Record {
    const records = this.getStorageData()
    const newRecord: Record = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
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
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthStr = date.toISOString().slice(0, 7)
      const monthRecords = records.filter(r => r.date.startsWith(monthStr))
      
      monthlyTrend.push({
        month: `${date.getMonth() + 1}月`,
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
}

export const storageService = new StorageService()
