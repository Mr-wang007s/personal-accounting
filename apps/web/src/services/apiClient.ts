/**
 * API 客户端 - 用于与后端通信
 * 重构：移除本地存储，所有数据直接通过 API 操作
 */

export interface ApiResponse<T> {
  code: number
  message: string
  data: T
  timestamp: string
}

export interface PingResponse {
  status: string
  timestamp: string
  name: string
  host: string
  port: number
  addresses: string[]
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

// 恢复响应（获取所有数据）
export interface RestoreResponse {
  success: boolean
  ledgers: CloudLedger[]
  records: CloudRecord[]
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

// 存储键（仅保留必要的 token 和 deviceId）
const TOKEN_KEY = 'pa_token'
const DEVICE_ID_KEY = 'pa_device_id'

class ApiClient {
  private baseUrl: string | null = null
  private token: string | null = null
  private deviceId: string

  constructor() {
    this.deviceId = this.getOrCreateDeviceId()
    this.token = localStorage.getItem(TOKEN_KEY)
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
  }

  getBaseUrl(): string | null {
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

  isConfigured(): boolean {
    return this.baseUrl !== null
  }

  isAuthenticated(): boolean {
    return this.getToken() !== null
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.baseUrl) {
      throw new Error('API base URL not configured')
    }

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

  // 服务发现 - ping 检查
  async ping(url?: string): Promise<PingResponse> {
    const targetUrl = url || this.baseUrl
    if (!targetUrl) {
      throw new Error('No URL provided')
    }
    
    const response = await fetch(`${targetUrl}/api/discovery/ping`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`Server not reachable: ${response.status}`)
    }

    const result: ApiResponse<PingResponse> = await response.json()
    return result.data
  }

  // 手机号登录
  async phoneLogin(phone: string, nickname?: string): Promise<LoginResponse> {
    return this.request('/api/auth/phone/login', {
      method: 'POST',
      body: JSON.stringify({ phone, nickname }),
    })
  }

  // ==================== 账本 CRUD API ====================

  /**
   * 获取所有账本
   */
  async getLedgers(): Promise<CloudLedger[]> {
    const result = await this.request<RestoreResponse>('/api/sync/restore')
    return result.ledgers || []
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
  async updateLedger(clientId: string, data: UpdateLedgerRequest): Promise<CloudLedger> {
    return this.request(`/api/ledgers/${clientId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  /**
   * 删除账本
   */
  async deleteLedger(clientId: string): Promise<{ deleted: boolean; recordsDeleted: number }> {
    return this.request('/api/sync/delete-ledger', {
      method: 'POST',
      body: JSON.stringify({ clientId }),
    })
  }

  // ==================== 记录 CRUD API ====================

  /**
   * 获取所有记录
   */
  async getRecords(): Promise<CloudRecord[]> {
    const result = await this.request<RestoreResponse>('/api/sync/restore')
    return result.records || []
  }

  /**
   * 获取指定账本的记录
   */
  async getRecordsByLedger(ledgerId: string): Promise<CloudRecord[]> {
    const records = await this.getRecords()
    return records.filter(r => r.ledgerId === ledgerId)
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
  async updateRecord(clientId: string, data: UpdateRecordRequest): Promise<CloudRecord> {
    return this.request(`/api/records/${clientId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  /**
   * 删除记录
   */
  async deleteRecord(clientId: string): Promise<{ deleted: boolean }> {
    return this.request(`/api/records/${clientId}`, {
      method: 'DELETE',
    })
  }

  /**
   * 批量删除记录
   */
  async deleteRecords(clientIds: string[]): Promise<{ deleted: number }> {
    return this.request('/api/records/batch-delete', {
      method: 'POST',
      body: JSON.stringify({ clientIds }),
    })
  }

  // ==================== 数据同步 API ====================

  /**
   * 获取所有数据（账本 + 记录）
   */
  async getAllData(): Promise<RestoreResponse> {
    return this.request('/api/sync/restore')
  }
}

export const apiClient = new ApiClient()
