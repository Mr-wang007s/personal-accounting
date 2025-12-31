/**
 * 统计相关业务逻辑 - 与 @personal-accounting/business-logic 保持一致
 * 小程序环境下的业务逻辑副本
 */
import type { Record, Statistics, DateRange } from '../shared/types'
import { RecordCalculator } from './records'

/**
 * 统计服务 - 纯函数实现
 */
export class StatisticsService {
  /**
   * 获取完整统计数据
   */
  static getStatistics(records: Record[], dateRange?: DateRange): Statistics {
    // 如果提供了日期范围，先过滤
    const filteredRecords = dateRange
      ? RecordCalculator.filterByDateRange(records, dateRange)
      : records

    const totalIncome = RecordCalculator.calculateTotalIncome(filteredRecords)
    const totalExpense = RecordCalculator.calculateTotalExpense(filteredRecords)
    const balance = totalIncome - totalExpense
    const categoryBreakdown = RecordCalculator.getCategoryBreakdown(filteredRecords, 'expense')
    const monthlyTrend = RecordCalculator.getMonthlyTrend(filteredRecords, 6)

    return {
      totalIncome,
      totalExpense,
      balance,
      categoryBreakdown,
      monthlyTrend,
    }
  }

  /**
   * 获取指定月份的统计
   */
  static getMonthlyStatistics(records: Record[], year: number, month: number): Statistics {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`

    return this.getStatistics(records, { start: startDate, end: endDate })
  }

  /**
   * 获取年度统计
   */
  static getYearlyStatistics(records: Record[], year: number): Statistics {
    const startDate = `${year}-01-01`
    const endDate = `${year}-12-31`

    return this.getStatistics(records, { start: startDate, end: endDate })
  }

  /**
   * 比较两个时间段的统计数据
   */
  static compareStatistics(
    current: Statistics,
    previous: Statistics
  ): {
    incomeChange: number
    expenseChange: number
    balanceChange: number
    incomeChangePercent: number
    expenseChangePercent: number
  } {
    const incomeChange = current.totalIncome - previous.totalIncome
    const expenseChange = current.totalExpense - previous.totalExpense
    const balanceChange = current.balance - previous.balance

    return {
      incomeChange,
      expenseChange,
      balanceChange,
      incomeChangePercent: previous.totalIncome > 0
        ? (incomeChange / previous.totalIncome) * 100
        : 0,
      expenseChangePercent: previous.totalExpense > 0
        ? (expenseChange / previous.totalExpense) * 100
        : 0,
    }
  }
}
