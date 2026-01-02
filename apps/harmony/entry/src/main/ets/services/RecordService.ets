/**
 * 记录服务 - 业务逻辑
 */
import { AccountRecord, RecordStatistics, CategoryBreakdown, MonthlyTrend, RecordType } from '../models'
import { storageService } from './StorageService'

class RecordService {
  // 获取记录列表
  async getRecords(ledgerId: string, options?: {
    type?: RecordType
    category?: string
    startDate?: string
    endDate?: string
  }): Promise<AccountRecord[]> {
    let records = await storageService.getRecords()

    // 按账本筛选
    records = records.filter(r => r.ledgerId === ledgerId)

    // 按类型筛选
    if (options?.type) {
      records = records.filter(r => r.type === options.type)
    }

    // 按分类筛选
    if (options?.category) {
      records = records.filter(r => r.category === options.category)
    }

    // 按日期范围筛选
    if (options?.startDate) {
      records = records.filter(r => r.date >= options.startDate!)
    }
    if (options?.endDate) {
      records = records.filter(r => r.date <= options.endDate!)
    }

    // 按日期倒序排列
    records.sort((a, b) => b.date.localeCompare(a.date))

    return records
  }

  // 创建记录
  async createRecord(data: {
    type: RecordType
    amount: number
    category: string
    date: string
    note?: string
    ledgerId: string
  }): Promise<AccountRecord> {
    const now = new Date().toISOString()
    const record = new AccountRecord({
      id: this.generateId(),
      clientId: this.generateId(),
      type: data.type,
      amount: data.amount,
      category: data.category,
      date: data.date,
      note: data.note,
      ledgerId: data.ledgerId,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'local'
    })

    await storageService.addRecord(record)
    return record
  }

  // 更新记录
  async updateRecord(id: string, updates: Partial<AccountRecord>): Promise<void> {
    await storageService.updateRecord(id, {
      ...updates,
      syncStatus: 'local'
    })
  }

  // 删除记录
  async deleteRecord(id: string): Promise<void> {
    await storageService.deleteRecord(id)
  }

  // 获取统计数据
  async getStatistics(ledgerId: string, startDate?: string, endDate?: string): Promise<RecordStatistics> {
    const records = await this.getRecords(ledgerId, { startDate, endDate })

    let totalIncome = 0
    let totalExpense = 0

    for (const record of records) {
      if (record.type === 'income') {
        totalIncome += record.amount
      } else {
        totalExpense += record.amount
      }
    }

    return new RecordStatistics({
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      recordCount: records.length
    })
  }

  // 获取分类统计
  async getCategoryStats(ledgerId: string, type: RecordType, startDate?: string, endDate?: string): Promise<CategoryBreakdown[]> {
    const records = await this.getRecords(ledgerId, { type, startDate, endDate })

    const categoryMap = new Map<string, { amount: number, count: number }>()
    let total = 0

    for (const record of records) {
      const existing = categoryMap.get(record.category) || { amount: 0, count: 0 }
      existing.amount += record.amount
      existing.count += 1
      categoryMap.set(record.category, existing)
      total += record.amount
    }

    const result: CategoryBreakdown[] = []
    categoryMap.forEach((value, category) => {
      result.push(new CategoryBreakdown({
        category,
        amount: value.amount,
        count: value.count,
        percentage: total > 0 ? (value.amount / total) * 100 : 0
      }))
    })

    // 按金额倒序
    result.sort((a, b) => b.amount - a.amount)
    return result
  }

  // 获取月度趋势
  async getMonthlyTrend(ledgerId: string, year: number): Promise<MonthlyTrend[]> {
    const startDate = `${year}-01-01`
    const endDate = `${year}-12-31`
    const records = await this.getRecords(ledgerId, { startDate, endDate })

    const monthMap = new Map<string, { income: number, expense: number }>()

    // 初始化12个月
    for (let m = 1; m <= 12; m++) {
      const month = `${year}-${m.toString().padStart(2, '0')}`
      monthMap.set(month, { income: 0, expense: 0 })
    }

    // 统计
    for (const record of records) {
      const month = record.date.substring(0, 7)
      const existing = monthMap.get(month)
      if (existing) {
        if (record.type === 'income') {
          existing.income += record.amount
        } else {
          existing.expense += record.amount
        }
      }
    }

    const result: MonthlyTrend[] = []
    monthMap.forEach((value, month) => {
      result.push(new MonthlyTrend({
        month,
        income: value.income,
        expense: value.expense
      }))
    })

    return result.sort((a, b) => a.month.localeCompare(b.month))
  }

  // 按日期分组记录
  groupRecordsByDate(records: AccountRecord[]): Map<string, AccountRecord[]> {
    const groups = new Map<string, AccountRecord[]>()
    for (const record of records) {
      const list = groups.get(record.date) || []
      list.push(record)
      groups.set(record.date, list)
    }
    return groups
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
  }
}

export const recordService = new RecordService()
