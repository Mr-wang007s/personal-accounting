// 类型定义 - 后续从 Web 项目迁移
export type RecordType = 'income' | 'expense'

// 同步状态：local = 仅本地，synced = 已同步到云端
export type SyncStatus = 'local' | 'synced'

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
  updatedAt?: string // 更新时间（用于判断是否需要重新同步）
}

export interface Category {
  id: string
  name: string
  icon: string
  type: RecordType
}

export interface CategoryStat {
  category: string
  amount: number
  percentage: number
  icon: string
}

export interface MonthlyData {
  month: string
  income: number
  expense: number
}

export interface Statistics {
  totalIncome: number
  totalExpense: number
  balance: number
  categoryBreakdown: CategoryStat[]
  monthlyTrend: MonthlyData[]
}

export interface DateRange {
  start: string
  end: string
}

// 账本类型
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
  id: string // GUID
  nickname: string
  currentLedgerId: string
  createdAt: string
  updatedAt: string
  phone?: string
}

// API 相关类型
export interface ApiResponse<T> {
  code: number
  message: string
  data: T
  timestamp: string
}

export interface PaginatedResponse<T> {
  records: T[]
  total: number
  page: number
  pageSize: number
}

// 用户类型（后续后端使用）
export interface User {
  id: string
  openid: string
  unionid?: string
  nickname?: string
  avatar?: string
  createdAt: string
  updatedAt: string
}
