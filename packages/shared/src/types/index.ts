// 类型定义 - 后续从 Web 项目迁移
export type RecordType = 'income' | 'expense'

export interface Record {
  id: string
  type: RecordType
  amount: number
  category: string
  date: string
  note?: string
  createdAt: string
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
