/**
 * 记录服务 - 记账记录相关操作
 * 重构：移除本地存储，所有操作直接通过 API 完成
 */
import type { Record, RecordType, GroupedRecords, Statistics } from '../shared/types'
import { generateId, getNowISO, getDateLabel } from '../shared/utils'
import { getCategoryById } from '../shared/constants'
import { RecordCalculator } from '../business-logic/records'
import { StatisticsService } from '../business-logic/statistics'
import { apiClient, CloudRecord, CreateRecordRequest, UpdateRecordRequest } from './apiClient'

/**
 * 将云端记录转换为本地格式
 */
function transformCloudRecord(cloudRecord: CloudRecord): Record {
  return {
    id: cloudRecord.clientId,
    type: cloudRecord.type,
    amount: cloudRecord.amount,
    category: cloudRecord.category,
    date: cloudRecord.date,
    note: cloudRecord.note,
    createdAt: cloudRecord.createdAt,
    updatedAt: cloudRecord.updatedAt,
    ledgerId: cloudRecord.ledgerId,
    syncStatus: 'synced',
    serverId: cloudRecord.serverId,
  }
}

export const RecordService = {
  /**
   * 添加记录（直接调用 API）
   */
  async addRecord(data: {
    type: RecordType
    amount: number
    category: string
    date: string
    note?: string
    ledgerId: string
  }): Promise<Record> {
    const clientId = generateId()
    const now = getNowISO()

    const request: CreateRecordRequest = {
      clientId,
      type: data.type,
      amount: data.amount,
      category: data.category,
      date: data.date,
      note: data.note,
      ledgerId: data.ledgerId,
    }

    const cloudRecord = await apiClient.createRecord(request)
    return transformCloudRecord(cloudRecord)
  },

  /**
   * 更新记录（直接调用 API）
   */
  async updateRecord(id: string, updates: Partial<Record>): Promise<void> {
    const request: UpdateRecordRequest = {
      type: updates.type,
      amount: updates.amount,
      category: updates.category,
      date: updates.date,
      note: updates.note,
    }

    await apiClient.updateRecord(id, request)
  },

  /**
   * 删除记录（直接调用 API）
   */
  async deleteRecord(id: string): Promise<void> {
    await apiClient.deleteRecord(id)
  },

  /**
   * 获取所有记录（从 API）
   */
  async getAllRecords(): Promise<Record[]> {
    const cloudRecords = await apiClient.getRecords()
    return cloudRecords.map(transformCloudRecord)
  },

  /**
   * 获取当前账本的记录（从缓存的 globalData）
   * 注意：这个方法使用 app.globalData 中的缓存数据
   */
  getRecordsByLedger(ledgerId: string): Record[] {
    const app = getApp<IAppOption>()
    const records = app.globalData.records || []
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
   * @param ledgerId 账本ID
   * @param months 月数，默认6个月
   */
  calculateMonthlyTrend(ledgerId: string, months: number = 6) {
    const records = this.getRecordsByLedger(ledgerId)
    return RecordCalculator.getMonthlyTrend(records, months)
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
