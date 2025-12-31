/**
 * API 客户端 - 用于与后端通信
 */

export interface ApiResponse<T> {
  code: number
  message: string
  data: T
  timestamp: string
}

export interface ServiceInfo {
  name: string
  host: string
  port: number
  addresses: string[]
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

class ApiClient {
  private baseUrl: string | null = null
  private token: string | null = null
  private deviceId: string

  constructor() {
    // 生成或获取设备 ID
    this.deviceId = this.getOrCreateDeviceId()
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
  async devLogin(identifier: string): Promise<{ accessToken: string; user: unknown }> {
    return this.request('/api/auth/dev/login', {
      method: 'POST',
      body: JSON.stringify({ identifier }),
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
      body: JSON.stringify(payload),
    })
  }

  // 全量同步
  async fullSync(): Promise<{ serverVersion: number; records: SyncRecord[] }> {
    return this.request('/api/sync/full')
  }
}

export const apiClient = new ApiClient()
