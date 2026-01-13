/**
 * API 客户端 - 用于与后端通信
 * 重构：使用标准 RESTful API
 */

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
const TOKEN_KEY = 'pa_token'
const DEVICE_ID_KEY = 'pa_device_id'
const BASE_URL_KEY = 'pa_base_url'

class ApiClient {
  private baseUrl: string
  private token: string | null = null
  private deviceId: string

  constructor() {
    this.deviceId = this.getOrCreateDeviceId()
    this.token = localStorage.getItem(TOKEN_KEY)
    // 默认使用本地后端，可通过 setBaseUrl 修改
    this.baseUrl = localStorage.getItem(BASE_URL_KEY) || 'http://localhost:3000'
  }

  private getOrCreateDeviceId(): string {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY)
    if (!deviceId) {
      deviceId = `web_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      localStorage.setItem(DEVICE_ID_KEY, deviceId)
    }
    return deviceId
  }

  getDeviceId(): string {
    return this.deviceId
  }

  setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/$/, '')
    localStorage.setItem(BASE_URL_KEY, this.baseUrl)
  }

  getBaseUrl(): string {
    return this.baseUrl
  }

  setToken(token: string): void {
    this.token = token
    localStorage.setItem(TOKEN_KEY, token)
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem(TOKEN_KEY)
    }
    return this.token
  }

  clearToken(): void {
    this.token = null
    localStorage.removeItem(TOKEN_KEY)
  }

  isAuthenticated(): boolean {
    return this.getToken() !== null
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-Device-Id': this.deviceId,
      ...options.headers,
    }

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    const result: ApiResponse<T> = await response.json()
    return result.data
  }

  // ==================== 认证 API ====================

  /**
   * 手机号登录（开发模式，无需验证码）
   */
  async phoneLogin(phone: string, nickname?: string): Promise<LoginResponse> {
    return this.request('/api/auth/phone/login', {
      method: 'POST',
      body: JSON.stringify({ phone, nickname }),
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
      body: JSON.stringify(data),
    })
  }

  /**
   * 更新账本
   */
  async updateLedger(id: string, data: UpdateLedgerRequest): Promise<CloudLedger> {
    return this.request(`/api/ledgers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
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
      body: JSON.stringify(data),
    })
  }

  /**
   * 更新记录
   */
  async updateRecord(id: string, data: UpdateRecordRequest): Promise<CloudRecord> {
    return this.request(`/api/records/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
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
      body: JSON.stringify({ ids }),
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
