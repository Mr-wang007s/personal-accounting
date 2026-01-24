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
  email?: string // 用户邮箱（用于同步）
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

// ============================================
// 用户认证系统类型（支持多种登录方式）
// ============================================

// 用户状态
export type UserStatus = 'active' | 'inactive' | 'banned'

// 认证类型
export type AuthType = 
  | 'email'     // 邮箱登录
  | 'phone'     // 手机号登录
  | 'wechat'    // 微信登录（小程序/公众号/开放平台）
  | 'google'    // Google 登录
  | 'github'    // GitHub 登录
  | 'apple'     // Apple 登录
  | 'username'  // 用户名密码登录

// 用户类型（与 Prisma schema 保持一致）
export interface User {
  id: string
  nickname?: string
  avatar?: string
  status: UserStatus
  createdAt: string
  updatedAt: string
  // 关联的认证方式（可选，查询时带出）
  auths?: UserAuth[]
}

// 用户认证凭证
export interface UserAuth {
  id: string
  userId: string
  authType: AuthType
  identifier: string // 邮箱/手机号/第三方openid
  credential?: string // 密码hash/access_token（不返回给前端）
  provider?: string // 第三方提供商
  unionid?: string // 微信 unionid
  verified: boolean
  createdAt: string
  updatedAt: string
}

// 登录响应（不含敏感信息）
export interface AuthUser {
  id: string
  nickname?: string
  avatar?: string
  status: UserStatus
  // 当前登录方式
  authType: AuthType
  identifier: string // 当前登录使用的标识（邮箱/手机号等）
  // 已绑定的登录方式列表
  boundAuths: {
    authType: AuthType
    identifier: string
    verified: boolean
  }[]
}
