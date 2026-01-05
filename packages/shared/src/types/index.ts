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

// 用户配置（小程序本地存储使用）
export interface UserProfile {
  id: string // GUID
  nickname: string
  currentLedgerId: string
  createdAt: string
  updatedAt: string
  phone?: string // 用户手机号（用于同步）
  serverUrl?: string // 同步服务器地址（云托管模式为 cloudrun）
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

// 用户类型（与 Prisma schema 保持一致）
export interface User {
  id: string
  phone: string // 手机号（主要标识，用于数据关联）
  openid?: string // 微信 openid（可选）
  unionid?: string // 微信 unionid（可选）
  nickname?: string
  avatar?: string
  password?: string // 密码（可选，Web 端使用）
  createdAt: string
  updatedAt: string
}
