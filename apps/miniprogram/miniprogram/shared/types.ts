/**
 * 类型定义 - 与 @personal-accounting/shared 保持一致
 * 小程序环境下的类型定义副本
 */

// 记录类型
export type RecordType = 'income' | 'expense'

// 同步状态：local = 仅本地，synced = 已同步到云端
export type SyncStatus = 'local' | 'synced'

// 记账记录
export interface Record {
  id: string
  type: RecordType
  amount: number
  category: string
  date: string
  note?: string
  createdAt: string
  ledgerId: string // 所属账本 ID（必填）
  // 简化的同步状态
  syncStatus?: SyncStatus // 默认 'local'
  serverId?: string // 云端 ID（同步后获得）
  updatedAt?: string // 更新时间
}

// 分类
export interface Category {
  id: string
  name: string
  icon: string
  type: RecordType
}

// 分类统计
export interface CategoryStat {
  category: string
  amount: number
  percentage: number
  icon: string
  name?: string // 小程序扩展字段
}

// 月度数据
export interface MonthlyData {
  month: string
  income: number
  expense: number
}

// 统计数据
export interface Statistics {
  totalIncome: number
  totalExpense: number
  balance: number
  categoryBreakdown: CategoryStat[]
  monthlyTrend: MonthlyData[]
}

// 日期范围
export interface DateRange {
  start: string
  end: string
}

// 账本
export interface Ledger {
  id: string
  name: string
  icon?: string
  color?: string
  createdAt: string
  updatedAt: string
}

// 用户配置
export interface UserProfile {
  id: string
  nickname: string
  currentLedgerId: string
  createdAt: string
  updatedAt: string
  phone?: string // 手机号
  avatar?: string // 头像 URL
  serverUrl?: string // 同步服务器地址
}

// 按日期分组的记录
export interface GroupedRecords {
  date: string
  dateLabel: string
  records: Record[]
  totalIncome: number
  totalExpense: number
}

// API 响应类型
export interface ApiResponse<T> {
  code: number
  message: string
  data: T
  timestamp: string
}

// 分页响应
export interface PaginatedResponse<T> {
  records: T[]
  total: number
  page: number
  pageSize: number
}
