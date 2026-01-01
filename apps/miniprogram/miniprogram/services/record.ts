/**
 * 记录服务 - 记账记录相关操作
 * 本地 + 云端双存储：CRUD 操作时自动备份到云端
 */
import type { Record, RecordType, GroupedRecords, Statistics } from '../shared/types'
import { generateId, getNowISO, getDateLabel } from '../shared/utils'
import { getCategoryById } from '../shared/constants'
import { RecordCalculator } from '../business-logic/records'
import { StatisticsService } from '../business-logic/statistics'
import { StorageService } from './storage'
import { syncService } from './sync'

export const RecordService = {
  /**
   * 添加记录（本地 + 云端）
   */
  addRecord(data: {
    type: RecordType
    amount: number
    category: string
    date: string
    note?: string
    ledgerId: string
  }): Record {
    const record: Record = {
      id: generateId(),
      type: data.type,
      amount: data.amount,
      category: data.category,
      date: data.date,
      note: data.note,
      createdAt: getNowISO(),
      ledgerId: data.ledgerId,
      syncStatus: 'local',
    }

    // 1. 先保存到本地
    StorageService.addRecord(record)
    
    // 2. 自动触发云端同步
    syncService.triggerAutoSync()
    
    return record
  },

  /**
   * 更新记录（本地 + 云端）
   */
  updateRecord(id: string, updates: Partial<Record>): void {
    // 1. 更新本地
    StorageService.updateRecord(id, updates)
    
    // 2. 标记需要重新同步
    syncService.markRecordForSync(id)
    
    // 3. 自动触发云端同步
    syncService.triggerAutoSync()
  },

  /**
   * 删除记录（本地 + 云端）
   */
  deleteRecord(id: string): void {
    // 检查是否已同步到云端
    const isSynced = syncService.isRecordSynced(id)
    
    // 使用 syncService 删除（会同时处理云端）
    syncService.deleteRecord(id, isSynced)
  },

  /**
   * 获取当前账本的记录
   */
  getRecordsByLedger(ledgerId: string): Record[] {
    const records = StorageService.getRecords()
    return records.filter((r) => r.ledgerId === ledgerId)
  },

  /**
   * 获取指定月份的记录
   */
  getRecordsByMonth(ledgerId: string, year: number, month: number): Record[] {
    const records = this.getRecordsByLedger(ledgerId)
    return records.filter((r) => {
      const date = new Date(r.date)
      return date.getFullYear() === year && date.getMonth() + 1 === month
    })
  },

  /**
   * 按日期分组记录（使用 business-logic）
   */
  groupRecordsByDate(records: Record[]): GroupedRecords[] {
    const groups = RecordCalculator.groupByDate(records)
    const result: GroupedRecords[] = []

    groups.forEach((groupRecords, date) => {
      const totalIncome = RecordCalculator.calculateTotalIncome(groupRecords)
      const totalExpense = RecordCalculator.calculateTotalExpense(groupRecords)

      result.push({
        date,
        dateLabel: getDateLabel(date),
        records: groupRecords.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
        totalIncome,
        totalExpense,
      })
    })

    // 按日期降序排序
    return result.sort((a, b) => b.date.localeCompare(a.date))
  },

  /**
   * 计算统计数据（使用 business-logic）
   */
  calculateStatistics(records: Record[]): Statistics {
    const stats = StatisticsService.getStatistics(records)
    
    // 为分类添加 name 字段（小程序需要）
    stats.categoryBreakdown = stats.categoryBreakdown.map((item) => {
      const cat = getCategoryById(item.category)
      return {
        ...item,
        name: cat?.name || item.category,
      }
    })

    return stats
  },

  /**
   * 计算月度趋势（使用 business-logic）
   */
  calculateMonthlyTrend(ledgerId: string) {
    const records = this.getRecordsByLedger(ledgerId)
    return RecordCalculator.getMonthlyTrend(records, 6)
  },

  /**
   * 获取月度统计（使用 business-logic）
   */
  getMonthlyStatistics(ledgerId: string, year: number, month: number): Statistics {
    const records = this.getRecordsByLedger(ledgerId)
    return StatisticsService.getMonthlyStatistics(records, year, month)
  },

  /**
   * 获取最近记录
   */
  getRecentRecords(ledgerId: string, limit: number = 5): Record[] {
    const records = this.getRecordsByLedger(ledgerId)
    const sorted = RecordCalculator.sortByDate(records)
    return sorted.slice(0, limit)
  },
}
