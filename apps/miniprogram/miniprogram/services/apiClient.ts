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

// callContainer 返回结果类型
interface CallContainerResult<T> {
  data: ApiResponse<T> | T
  statusCode: number
  header: Record<string, string>
  callID: string
}

class ApiClient {
  private token: string | null = null
  private deviceId: string
  private cloudInitialized = false

  constructor() {
    this.deviceId = this.getOrCreateDeviceId()
    this.token = wx.getStorageSync(TOKEN_KEY) || null
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
    wx.setStorageSync(TOKEN_KEY, token)
  }

  getToken(): string | null {
    return this.token
  }

  clearToken(): void {
    this.token = null
    wx.removeStorageSync(TOKEN_KEY)
  }

  isAuthenticated(): boolean {
    return this.token !== null
  }

  /**
   * 通用请求方法 - 使用 wx.cloud.callContainer
   */
  private request<T>(path: string, options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    data?: unknown
    header?: Record<string, string>
  } = {}): Promise<T> {
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

  // ==================== 认证 API ====================

  /**
   * 手机号登录
   * @param phone 手机号
   * @param nickname 昵称（可选）
   */
  async phoneLogin(phone: string, nickname?: string): Promise<LoginResponse> {
    return this.request('/api/auth/phone/login', {
      method: 'POST',
      data: { phone, nickname },
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
