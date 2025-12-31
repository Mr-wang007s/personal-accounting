// 记账记录相关业务逻辑
import type { Record, CategoryStat, MonthlyData, DateRange } from '@personal-accounting/shared'
import { getCategoryById, dayjs } from '@personal-accounting/shared'

/**
 * 记录计算器 - 纯函数实现
 */
export class RecordCalculator {
  /**
   * 计算余额（收入 - 支出）
   */
  static calculateBalance(records: Record[]): number {
    const income = records
      .filter((r) => r.type === 'income')
      .reduce((sum, r) => sum + r.amount, 0)
    const expense = records
      .filter((r) => r.type === 'expense')
      .reduce((sum, r) => sum + r.amount, 0)
    return income - expense
  }

  /**
   * 计算总收入
   */
  static calculateTotalIncome(records: Record[]): number {
    return records
      .filter((r) => r.type === 'income')
      .reduce((sum, r) => sum + r.amount, 0)
  }

  /**
   * 计算总支出
   */
  static calculateTotalExpense(records: Record[]): number {
    return records
      .filter((r) => r.type === 'expense')
      .reduce((sum, r) => sum + r.amount, 0)
  }

  /**
   * 获取分类占比统计
   */
  static getCategoryBreakdown(records: Record[], type: 'income' | 'expense' = 'expense'): CategoryStat[] {
    const filteredRecords = records.filter((r) => r.type === type)
    const total = filteredRecords.reduce((sum, r) => sum + r.amount, 0)

    if (total === 0) return []

    const categoryMap = new Map<string, number>()
    filteredRecords.forEach((r) => {
      const current = categoryMap.get(r.category) || 0
      categoryMap.set(r.category, current + r.amount)
    })

    return Array.from(categoryMap.entries())
      .map(([category, amount]) => {
        const cat = getCategoryById(category)
        return {
          category: cat?.name || category,
          amount,
          percentage: (amount / total) * 100,
          icon: cat?.icon || 'Circle',
        }
      })
      .sort((a, b) => b.amount - a.amount)
  }

  /**
   * 获取月度趋势数据
   */
  static getMonthlyTrend(records: Record[], months: number = 6): MonthlyData[] {
    const result: MonthlyData[] = []
    const now = dayjs()

    for (let i = months - 1; i >= 0; i--) {
      const date = now.subtract(i, 'month')
      const monthStr = date.format('YYYY-MM')
      const monthRecords = records.filter((r) => r.date.startsWith(monthStr))

      result.push({
        month: `${date.month() + 1}月`,
        income: monthRecords
          .filter((r) => r.type === 'income')
          .reduce((sum, r) => sum + r.amount, 0),
        expense: monthRecords
          .filter((r) => r.type === 'expense')
          .reduce((sum, r) => sum + r.amount, 0),
      })
    }

    return result
  }

  /**
   * 按日期范围过滤记录
   */
  static filterByDateRange(records: Record[], dateRange: DateRange): Record[] {
    return records.filter((r) => r.date >= dateRange.start && r.date <= dateRange.end)
  }

  /**
   * 按日期排序记录（默认降序，最新的在前）
   */
  static sortByDate(records: Record[], ascending: boolean = false): Record[] {
    const sorted = [...records].sort((a, b) => {
      return dayjs(b.date).valueOf() - dayjs(a.date).valueOf()
    })
    return ascending ? sorted.reverse() : sorted
  }

  /**
   * 按日期分组记录
   */
  static groupByDate(records: Record[]): Map<string, Record[]> {
    const groups = new Map<string, Record[]>()
    records.forEach((record) => {
      const existing = groups.get(record.date) || []
      groups.set(record.date, [...existing, record])
    })
    return groups
  }
}
