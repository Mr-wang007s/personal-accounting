/**
 * API 客户端 - 用于与后端通信
 * 微信小程序版本 - 简化版（OneDrive 模式）
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

// 云端记录
export interface CloudRecord {
  serverId: string
  clientId: string
  type: 'income' | 'expense'
  amount: number
  category: string
  date: string
  note?: string
  createdAt: string
  updatedAt: string
  ledgerId: string
}

// 备份请求
export interface BackupRecord {
  clientId: string
  type: 'income' | 'expense'
  amount: number
  category: string
  date: string
  note?: string
  createdAt: string
  updatedAt?: string
  ledgerId: string
}

// 备份响应
export interface BackupResponse {
  success: boolean
  uploaded: number
  records: Array<{
    clientId: string
    serverId: string
  }>
}

// 恢复响应
export interface RestoreResponse {
  success: boolean
  records: CloudRecord[]
}

// 存储键
const DEVICE_ID_KEY = 'pa_device_id'
const TOKEN_KEY = 'pa_token'

// 请求选项（不含 url，由 request 方法内部拼接）
interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: unknown
  header?: Record<string, string>
}

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

  isAuthenticated(): boolean {
    return this.token !== null
  }

  private request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.baseUrl) {
        reject(new Error('API base URL not configured'))
        return
      }

      const header: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Device-Id': this.deviceId,
        ...(options.header || {}),
      }

      if (this.token) {
        header['Authorization'] = `Bearer ${this.token}`
      }

      wx.request({
        url: `${this.baseUrl}${endpoint}`,
        method: options.method || 'GET',
        data: options.data as string | object | ArrayBuffer | undefined,
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

  // 用户注册/登录（开发环境）
  async register(nickname: string): Promise<{ accessToken: string; user: { id: string; openid: string; nickname: string; avatar: string | null } }> {
    return this.request('/api/auth/dev/login', {
      method: 'POST',
      data: { 
        openid: this.deviceId,
        nickname 
      },
    })
  }

  // 开发环境登录
  async devLogin(identifier: string, nickname?: string): Promise<{ accessToken: string; user: { id: string; openid: string; nickname: string; avatar: string | null } }> {
    return this.request('/api/auth/dev/login', {
      method: 'POST',
      data: { openid: identifier, nickname },
    })
  }

  // ==================== 新版简化 API ====================

  /**
   * 备份：上传本地记录到云端
   */
  async backup(records: BackupRecord[]): Promise<BackupResponse> {
    return this.request('/api/sync/backup', {
      method: 'POST',
      data: { records },
    })
  }

  /**
   * 恢复：从云端下载所有记录
   */
  async restore(): Promise<RestoreResponse> {
    return this.request('/api/sync/restore')
  }

  /**
   * 删除云端记录
   */
  async deleteCloudRecords(serverIds: string[]): Promise<{ deleted: number }> {
    return this.request('/api/sync/delete-cloud', {
      method: 'POST',
      data: { serverIds },
    })
  }
}

export const apiClient = new ApiClient()
