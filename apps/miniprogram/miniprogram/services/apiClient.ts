/**
 * API 客户端 - 用于与后端通信
 * 微信云托管版本 - 使用 wx.cloud.callContainer
 * 
 * 重构：简化接口，移除冗余代码
 */

/// <reference path="../typings/wx.d.ts" />

// 云托管配置
const CLOUD_CONFIG = {
  env: 'prod-5gqmub7sd1872233',
  service: 'express-g8es',  // 云托管服务名
}

export interface ApiResponse<T> {
  code: number
  message: string
  data: T
  timestamp: string
}

// 云端账本
export interface CloudLedger {
  id: string
  name: string
  icon?: string
  color?: string
  createdAt: string
  updatedAt: string
}

// 云端记录
export interface CloudRecord {
  id: string
  type: 'income' | 'expense'
  amount: number
  category: string
  date: string
  note?: string
  createdAt: string
  updatedAt: string
  ledgerId: string
}

// 创建账本请求
export interface CreateLedgerRequest {
  clientId: string
  name: string
  icon?: string
  color?: string
}

// 更新账本请求
export interface UpdateLedgerRequest {
  name?: string
  icon?: string
  color?: string
}

// 创建记录请求
export interface CreateRecordRequest {
  clientId: string
  type: 'income' | 'expense'
  amount: number
  category: string
  date: string
  note?: string
  ledgerId: string
}

// 更新记录请求
export interface UpdateRecordRequest {
  type?: 'income' | 'expense'
  amount?: number
  category?: string
  date?: string
  note?: string
}

// 登录响应
export interface LoginResponse {
  accessToken: string
  user: {
    id: string
    phone: string
    openid?: string
    nickname?: string
    avatar?: string
  }
  isNewUser: boolean
}

// 存储键
const DEVICE_ID_KEY = 'pa_device_id'
const TOKEN_KEY = 'pa_token'
const TOKEN_EXPIRE_KEY = 'pa_token_expire'

// Token 有效期（毫秒）- 7天，提前1天刷新
const TOKEN_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000
const TOKEN_REFRESH_THRESHOLD_MS = 1 * 24 * 60 * 60 * 1000

// callContainer 返回结果类型
interface CallContainerResult<T> {
  data: ApiResponse<T> | T
  statusCode: number
  header: Record<string, string>
  callID: string
}

class ApiClient {
  private token: string | null = null
  private tokenExpireTime: number = 0
  private deviceId: string
  private cloudInitialized = false
  private isRefreshing = false
  private refreshPromise: Promise<boolean> | null = null

  constructor() {
    this.deviceId = this.getOrCreateDeviceId()
    this.token = wx.getStorageSync(TOKEN_KEY) || null
    this.tokenExpireTime = wx.getStorageSync(TOKEN_EXPIRE_KEY) || 0
    this.initCloud()
  }

  private initCloud(): void {
    if (this.cloudInitialized) return
    try {
      wx.cloud.init({
        env: CLOUD_CONFIG.env,
        traceUser: true,
      })
      this.cloudInitialized = true
      console.log('[ApiClient] 云开发初始化成功')
    } catch (error) {
      console.error('[ApiClient] 云开发初始化失败:', error)
    }
  }

  private getOrCreateDeviceId(): string {
    let deviceId = wx.getStorageSync(DEVICE_ID_KEY)
    if (!deviceId) {
      deviceId = `mp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      wx.setStorageSync(DEVICE_ID_KEY, deviceId)
    }
    return deviceId
  }

  getDeviceId(): string {
    return this.deviceId
  }

  setToken(token: string): void {
    this.token = token
    this.tokenExpireTime = Date.now() + TOKEN_LIFETIME_MS
    wx.setStorageSync(TOKEN_KEY, token)
    wx.setStorageSync(TOKEN_EXPIRE_KEY, this.tokenExpireTime)
  }

  getToken(): string | null {
    return this.token
  }

  clearToken(): void {
    this.token = null
    this.tokenExpireTime = 0
    wx.removeStorageSync(TOKEN_KEY)
    wx.removeStorageSync(TOKEN_EXPIRE_KEY)
  }

  isAuthenticated(): boolean {
    return this.token !== null
  }

  /**
   * 检查 token 是否需要刷新（距离过期不足1天）
   */
  shouldRefreshToken(): boolean {
    if (!this.token || !this.tokenExpireTime) return false
    const timeUntilExpire = this.tokenExpireTime - Date.now()
    return timeUntilExpire > 0 && timeUntilExpire < TOKEN_REFRESH_THRESHOLD_MS
  }

  /**
   * 检查 token 是否已过期
   */
  isTokenExpired(): boolean {
    if (!this.token || !this.tokenExpireTime) return true
    return Date.now() >= this.tokenExpireTime
  }

  /**
   * 通用请求方法 - 使用 wx.cloud.callContainer
   * 支持自动刷新 token
   */
  private async request<T>(path: string, options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    data?: unknown
    header?: Record<string, string>
    skipAutoRefresh?: boolean  // 跳过自动刷新（用于 refresh 接口本身）
  } = {}): Promise<T> {
    // 自动刷新 token（如果需要且不是 refresh 请求本身）
    if (!options.skipAutoRefresh && this.shouldRefreshToken()) {
      console.log('[ApiClient] Token 即将过期，尝试刷新...')
      await this.tryRefreshToken()
    }

    return new Promise((resolve, reject) => {
      const header: Record<string, string> = {
        'X-WX-SERVICE': CLOUD_CONFIG.service,
        'content-type': 'application/json',
        'X-Device-Id': this.deviceId,
        ...(options.header || {}),
      }

      if (this.token) {
        header['Authorization'] = `Bearer ${this.token}`
      }

      wx.cloud.callContainer({
        config: {
          env: CLOUD_CONFIG.env,
        },
        path,
        method: options.method || 'GET',
        header,
        data: options.data || '',
        success: (res: CallContainerResult<T>) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const responseData = res.data
            if (responseData && typeof responseData === 'object' && 'data' in responseData) {
              resolve((responseData as ApiResponse<T>).data)
            } else {
              resolve(responseData as T)
            }
          } else if (res.statusCode === 401 && !options.skipAutoRefresh) {
            // Token 失效，尝试刷新后重试
            console.log('[ApiClient] 收到 401，尝试刷新 token 后重试...')
            this.tryRefreshToken().then(success => {
              if (success) {
                // 重试请求
                this.request<T>(path, { ...options, skipAutoRefresh: true })
                  .then(resolve)
                  .catch(reject)
              } else {
                reject(new Error('登录已过期，请重新登录'))
              }
            })
          } else {
            const error = res.data as { message?: string }
            reject(new Error(error?.message || `HTTP ${res.statusCode}`))
          }
        },
        fail: (err: { errMsg?: string; errCode?: number }) => {
          console.error('[ApiClient] callContainer 失败:', err)
          reject(new Error(err.errMsg || '云托管请求失败'))
        },
      })
    })
  }

  /**
   * 尝试刷新 token
   * 使用锁机制避免并发刷新
   */
  private async tryRefreshToken(): Promise<boolean> {
    // 如果已经在刷新，等待刷新完成
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise
    }

    // 如果没有 token，无法刷新
    if (!this.token) {
      return false
    }

    this.isRefreshing = true
    this.refreshPromise = this.doRefreshToken()

    try {
      return await this.refreshPromise
    } finally {
      this.isRefreshing = false
      this.refreshPromise = null
    }
  }

  /**
   * 执行 token 刷新
   */
  private async doRefreshToken(): Promise<boolean> {
    try {
      const result = await this.refreshToken()
      this.setToken(result.accessToken)
      console.log('[ApiClient] Token 刷新成功')
      return true
    } catch (error) {
      console.error('[ApiClient] Token 刷新失败:', error)
      // 刷新失败，清除 token
      this.clearToken()
      return false
    }
  }

  // ==================== 认证 API ====================

  /**
   * 手机号/邮箱登录（开发/测试用，无验证码）
   * @param phone 手机号或邮箱
   * @param nickname 昵称（可选）
   */
  async phoneLogin(phone: string, nickname?: string): Promise<LoginResponse> {
    return this.request('/api/auth/phone/login', {
      method: 'POST',
      data: { phone, nickname },
      skipAutoRefresh: true,
    })
  }

  /**
   * 发送邮箱验证码
   * @param email 邮箱地址
   */
  async sendEmailCode(email: string): Promise<{ success: boolean; message: string }> {
    return this.request('/api/auth/email/send', {
      method: 'POST',
      data: { email },
      skipAutoRefresh: true,
    })
  }

  /**
   * 邮箱验证码登录
   * @param email 邮箱地址
   * @param code 验证码
   * @param nickname 昵称（可选）
   */
  async emailLogin(email: string, code: string, nickname?: string): Promise<LoginResponse> {
    return this.request('/api/auth/email/login', {
      method: 'POST',
      data: { email, code, nickname },
      skipAutoRefresh: true,
    })
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(): Promise<LoginResponse['user']> {
    return this.request('/api/auth/me', {
      method: 'GET',
    })
  }

  /**
   * 刷新 Token
   */
  async refreshToken(): Promise<LoginResponse> {
    return this.request('/api/auth/refresh', {
      method: 'POST',
      skipAutoRefresh: true,  // 刷新请求本身不触发自动刷新
    })
  }

  // ==================== 账本 CRUD API ====================

  /**
   * 获取所有账本
   */
  async getLedgers(): Promise<CloudLedger[]> {
    return this.request('/api/ledgers', {
      method: 'GET',
    })
  }

  /**
   * 创建账本
   */
  async createLedger(data: CreateLedgerRequest): Promise<CloudLedger> {
    return this.request('/api/ledgers', {
      method: 'POST',
      data,
    })
  }

  /**
   * 更新账本
   */
  async updateLedger(id: string, data: UpdateLedgerRequest): Promise<CloudLedger> {
    return this.request(`/api/ledgers/${id}`, {
      method: 'PUT',
      data,
    })
  }

  /**
   * 删除账本
   */
  async deleteLedger(id: string): Promise<{ deleted: boolean }> {
    return this.request(`/api/ledgers/${id}`, {
      method: 'DELETE',
    })
  }

  // ==================== 记录 CRUD API ====================

  /**
   * 获取所有记录
   */
  async getRecords(): Promise<CloudRecord[]> {
    return this.request('/api/records', {
      method: 'GET',
    })
  }

  /**
   * 获取指定账本的记录
   */
  async getRecordsByLedger(ledgerId: string): Promise<CloudRecord[]> {
    return this.request(`/api/records?ledgerId=${ledgerId}`, {
      method: 'GET',
    })
  }

  /**
   * 创建记录
   */
  async createRecord(data: CreateRecordRequest): Promise<CloudRecord> {
    return this.request('/api/records', {
      method: 'POST',
      data,
    })
  }

  /**
   * 更新记录
   */
  async updateRecord(id: string, data: UpdateRecordRequest): Promise<CloudRecord> {
    return this.request(`/api/records/${id}`, {
      method: 'PUT',
      data,
    })
  }

  /**
   * 删除记录
   */
  async deleteRecord(id: string): Promise<{ deleted: boolean }> {
    return this.request(`/api/records/${id}`, {
      method: 'DELETE',
    })
  }

  /**
   * 批量删除记录
   */
  async deleteRecords(ids: string[]): Promise<{ deleted: number }> {
    return this.request('/api/records/batch-delete', {
      method: 'POST',
      data: { ids },
    })
  }

  // ==================== 数据获取 API ====================

  /**
   * 获取所有数据（账本 + 记录）
   */
  async getAllData(): Promise<{ ledgers: CloudLedger[]; records: CloudRecord[] }> {
    const [ledgers, records] = await Promise.all([
      this.getLedgers(),
      this.getRecords(),
    ])
    return { ledgers, records }
  }
}

export const apiClient = new ApiClient()
