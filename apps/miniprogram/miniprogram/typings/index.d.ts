/**
 * 小程序全局类型定义
 * 
 * 注意：核心类型已迁移至 shared/types.ts
 * 此文件仅保留小程序特有的全局类型声明
 */

/// <reference path="./wx.d.ts" />

// 从 shared 导入核心类型
import type { 
  Record, 
  RecordType, 
  Category, 
  Ledger, 
  UserProfile,
  Statistics,
  CategoryStat,
  MonthlyData,
  GroupedRecords,
  DateRange
} from '../shared/types'

// 重新导出类型供全局使用
export type {
  Record,
  RecordType,
  Category,
  Ledger,
  UserProfile,
  Statistics,
  CategoryStat,
  MonthlyData,
  GroupedRecords,
  DateRange
}

// App 全局数据接口
interface IAppOption {
  globalData: {
    userProfile: UserProfile | null
    currentLedger: Ledger | null
    ledgers: Ledger[]
    records: Record[]
    isInitialized: boolean
    isLoggedIn: boolean
  }
  initPromise: Promise<void> | null
  initializeApp(): Promise<void>
  completeOnboarding(nickname: string, ledgerName: string, serverUrl?: string): Promise<{
    userProfile: UserProfile
    ledger: Ledger
    registered: boolean
  }>
  refreshData(): void
}

// 声明全局类型
declare global {
  // 为了兼容旧代码，保留全局类型别名
  type IRecord = Record
  type ICategory = Category
  type ICategoryStat = CategoryStat & { name: string }
  type IMonthlyData = MonthlyData
  type IStatistics = Statistics
  type ILedger = Ledger
  type IUserProfile = UserProfile
  type IDateRange = DateRange
  type IGroupedRecords = GroupedRecords
}
