/**
 * API 客户端 - 用于与后端通信
 * 微信小程序版本
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

export interface SyncStatus {
  deviceId: string
  lastSyncAt: string | null
  clientVersion: number
  serverVersion: number
  needsSync: boolean
}

export interface SyncRecord {
  id: string
  clientId: string | null
  type: 'income' | 'expense'
  amount: number
  category: string
  date: string
  note: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  syncVersion: number
}

export interface PullResponse {
  serverVersion: number
  changes: SyncRecord[]
}

export interface PushPayload {
  created: Array<{
    clientId: string
    type: 'income' | 'expense'
    amount: number
    category: string
    date: string
    note?: string
  }>
  updated: Array<{
    id: string
    clientId?: string
    type?: 'income' | 'expense'
    amount?: number
    category?: string
    date?: string
    note?: string
    syncVersion?: number
  }>
  deleted: string[]
}

export interface PushResponse {
  serverVersion: number
  created: number
  updated: number
  deleted: number
  conflicts: Array<{
    clientId: string
    serverId: string
    type: 'create' | 'update' | 'delete'
    reason: string
  }>
}

// 存储键
const DEVICE_ID_KEY = 'pa_device_id'
const TOKEN_KEY = 'pa_token'

class ApiClient {
  private baseUrl: string | null = null
  private token: string | null = null
  private deviceId: string

  constructor() {
    this.deviceId = this.getOrCreateDeviceId()
    this.token = wx.getStorageSync(TOKEN_KEY) || null
  }

  private getOrCreateDeviceId(): string {
    let deviceId = wx.getStorageSync(DEVICE_ID_KEY)
    if (!deviceId) {
      deviceId = `miniprogram_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      wx.setStorageSync(DEVICE_ID_KEY, deviceId)
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
    wx.setStorageSync(TOKEN_KEY, token)
  }

  getToken(): string | null {
    return this.token
  }

  clearToken(): void {
    this.token = null
    wx.removeStorageSync(TOKEN_KEY)
  }

  isConfigured(): boolean {
    return this.baseUrl !== null
  }

  private request<T>(endpoint: string, options: WechatMiniprogram.RequestOption = {}): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.baseUrl) {
        reject(new Error('API base URL not configured'))
        return
      }

      const header: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Device-Id': this.deviceId,
        ...((options.header as Record<string, string>) || {}),
      }

      if (this.token) {
        header['Authorization'] = `Bearer ${this.token}`
      }

      wx.request({
        url: `${this.baseUrl}${endpoint}`,
        method: (options.method as 'GET' | 'POST') || 'GET',
        data: options.data,
        header,
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const result = res.data as ApiResponse<T>
            resolve(result.data)
          } else {
            const error = res.data as { message?: string }
            reject(new Error(error.message || `HTTP ${res.statusCode}`))
          }
        },
        fail: (err) => {
          reject(new Error(err.errMsg || '网络请求失败'))
        },
      })
    })
  }

  // 服务发现 - ping 检查
  ping(url: string): Promise<PingResponse> {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${url}/api/discovery/ping`,
        method: 'GET',
        header: { 'Content-Type': 'application/json' },
        success: (res) => {
          if (res.statusCode === 200) {
            const result = res.data as ApiResponse<PingResponse>
            resolve(result.data)
          } else {
            reject(new Error(`Server not reachable: ${res.statusCode}`))
          }
        },
        fail: (err) => {
          reject(new Error(err.errMsg || '无法连接服务器'))
        },
      })
    })
  }

  // 开发环境登录
  async devLogin(identifier: string): Promise<{ accessToken: string; user: unknown }> {
    return this.request('/api/auth/dev/login', {
      method: 'POST',
      data: { openid: identifier },
    })
  }

  // 获取同步状态
  async getSyncStatus(): Promise<SyncStatus> {
    return this.request('/api/sync/status')
  }

  // 拉取增量数据
  async pull(lastSyncVersion: number = 0): Promise<PullResponse> {
    return this.request(`/api/sync/pull?lastSyncVersion=${lastSyncVersion}`)
  }

  // 推送本地变更
  async push(payload: PushPayload): Promise<PushResponse> {
    return this.request('/api/sync/push', {
      method: 'POST',
      data: payload,
    })
  }

  // 全量同步
  async fullSync(): Promise<{ serverVersion: number; records: SyncRecord[] }> {
    return this.request('/api/sync/full')
  }
}

export const apiClient = new ApiClient()
