/**
 * API 客户端 - 用于与后端通信
 * 简化版（OneDrive 模式）
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

class ApiClient {
  private baseUrl: string | null = null
  private token: string | null = null
  private deviceId: string

  constructor() {
    this.deviceId = this.getOrCreateDeviceId()
    this.token = localStorage.getItem('pa_token')
  }

  private getOrCreateDeviceId(): string {
    const key = 'pa_device_id'
    let deviceId = localStorage.getItem(key)
    if (!deviceId) {
      deviceId = `web_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      localStorage.setItem(key, deviceId)
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
    localStorage.setItem('pa_token', token)
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('pa_token')
    }
    return this.token
  }

  clearToken(): void {
    this.token = null
    localStorage.removeItem('pa_token')
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
  async ping(url: string): Promise<PingResponse> {
    const response = await fetch(`${url}/api/discovery/ping`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`Server not reachable: ${response.status}`)
    }

    const result: ApiResponse<PingResponse> = await response.json()
    return result.data
  }

  // 开发环境登录
  async devLogin(identifier: string, nickname?: string): Promise<{ accessToken: string; user: unknown }> {
    return this.request('/api/auth/dev/login', {
      method: 'POST',
      body: JSON.stringify({ openid: identifier, nickname }),
    })
  }

  // ==================== 新版简化 API ====================

  /**
   * 备份：上传本地记录到云端
   */
  async backup(records: BackupRecord[]): Promise<BackupResponse> {
    return this.request('/api/sync/backup', {
      method: 'POST',
      body: JSON.stringify({ records }),
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
      body: JSON.stringify({ serverIds }),
    })
  }
}

export const apiClient = new ApiClient()
