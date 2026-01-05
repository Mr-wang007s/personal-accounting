/**
 * API 服务 - HTTP 客户端
 * 重构：添加完整的 CRUD API，移除本地存储依赖
 */
import { http } from '@kit.NetworkKit'
import { AccountRecord, Ledger } from '../models'

interface ApiResponse<T> {
  code: number
  message: string
  data: T
  timestamp: string
}

// 云端账本
interface CloudLedger {
  serverId: string
  clientId: string
  name: string
  icon?: string
  color?: string
  createdAt: string
  updatedAt: string
}

// 云端记录
interface CloudRecord {
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

// 恢复响应
interface RestoreResponse {
  success: boolean
  ledgers: CloudLedger[]
  records: CloudRecord[]
}

class ApiService {
  private baseUrl: string = ''
  private token: string = ''
  private deviceId: string = ''

  setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/$/, '')
  }

  getBaseUrl(): string {
    return this.baseUrl
  }

  setToken(token: string): void {
    this.token = token
  }

  getToken(): string {
    return this.token
  }

  clearToken(): void {
    this.token = ''
  }

  isAuthenticated(): boolean {
    return this.token.length > 0
  }

  setDeviceId(id: string): void {
    this.deviceId = id
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }
    if (this.deviceId) {
      headers['X-Device-Id'] = this.deviceId
    }
    return headers
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    let url = `${this.baseUrl}${path}`
    if (params) {
      const query = Object.entries(params)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&')
      url += `?${query}`
    }

    const httpRequest = http.createHttp()
    try {
      const response = await httpRequest.request(url, {
        method: http.RequestMethod.GET,
        header: this.getHeaders(),
        connectTimeout: 10000,
        readTimeout: 10000
      })

      if (response.responseCode === 200) {
        const result = JSON.parse(response.result as string) as ApiResponse<T>
        if (result.code === 0) {
          return result.data
        }
        throw new Error(result.message || '请求失败')
      }
      throw new Error(`HTTP ${response.responseCode}`)
    } finally {
      httpRequest.destroy()
    }
  }

  async post<T>(path: string, data?: object): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const httpRequest = http.createHttp()

    try {
      const response = await httpRequest.request(url, {
        method: http.RequestMethod.POST,
        header: this.getHeaders(),
        extraData: data ? JSON.stringify(data) : undefined,
        connectTimeout: 10000,
        readTimeout: 10000
      })

      if (response.responseCode === 200 || response.responseCode === 201) {
        const result = JSON.parse(response.result as string) as ApiResponse<T>
        if (result.code === 0) {
          return result.data
        }
        throw new Error(result.message || '请求失败')
      }
      throw new Error(`HTTP ${response.responseCode}`)
    } finally {
      httpRequest.destroy()
    }
  }

  async put<T>(path: string, data?: object): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const httpRequest = http.createHttp()

    try {
      const response = await httpRequest.request(url, {
        method: http.RequestMethod.PUT,
        header: this.getHeaders(),
        extraData: data ? JSON.stringify(data) : undefined,
        connectTimeout: 10000,
        readTimeout: 10000
      })

      if (response.responseCode === 200) {
        const result = JSON.parse(response.result as string) as ApiResponse<T>
        if (result.code === 0) {
          return result.data
        }
        throw new Error(result.message || '请求失败')
      }
      throw new Error(`HTTP ${response.responseCode}`)
    } finally {
      httpRequest.destroy()
    }
  }

  async delete<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const httpRequest = http.createHttp()

    try {
      const response = await httpRequest.request(url, {
        method: http.RequestMethod.DELETE,
        header: this.getHeaders(),
        connectTimeout: 10000,
        readTimeout: 10000
      })

      if (response.responseCode === 200) {
        const result = JSON.parse(response.result as string) as ApiResponse<T>
        if (result.code === 0) {
          return result.data
        }
        throw new Error(result.message || '请求失败')
      }
      throw new Error(`HTTP ${response.responseCode}`)
    } finally {
      httpRequest.destroy()
    }
  }

  // ==================== 健康检查 ====================

  async ping(): Promise<boolean> {
    try {
      await this.get('/api/discovery/ping')
      return true
    } catch {
      return false
    }
  }

  // ==================== 认证 API ====================

  async phoneLogin(phone: string, nickname?: string): Promise<{ accessToken: string, user: object, isNewUser: boolean }> {
    return this.post('/api/auth/phone/login', { phone, nickname })
  }

  // ==================== 数据同步 API ====================

  async getAllData(): Promise<{ ledgers: Ledger[], records: AccountRecord[] }> {
    const response = await this.get<RestoreResponse>('/api/sync/restore')
    
    const ledgers = (response.ledgers || []).map(l => Ledger.fromJson({
      id: l.clientId,
      name: l.name,
      icon: l.icon,
      color: l.color,
      createdAt: l.createdAt,
      updatedAt: l.updatedAt
    }))
    
    const records = (response.records || []).map(r => AccountRecord.fromJson({
      id: r.clientId,
      type: r.type,
      amount: r.amount,
      category: r.category,
      date: r.date,
      note: r.note,
      ledgerId: r.ledgerId,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      syncStatus: 'synced',
      serverId: r.serverId
    }))
    
    return { ledgers, records }
  }

  // ==================== 账本 CRUD API ====================

  async createLedger(data: { clientId: string, name: string, icon?: string, color?: string }): Promise<Ledger> {
    const result = await this.post<CloudLedger>('/api/ledgers', data)
    return Ledger.fromJson({
      id: result.clientId,
      name: result.name,
      icon: result.icon,
      color: result.color,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt
    })
  }

  async updateLedger(clientId: string, data: { name?: string, icon?: string, color?: string }): Promise<Ledger> {
    const result = await this.put<CloudLedger>(`/api/ledgers/${clientId}`, data)
    return Ledger.fromJson({
      id: result.clientId,
      name: result.name,
      icon: result.icon,
      color: result.color,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt
    })
  }

  async deleteLedger(clientId: string): Promise<{ deleted: boolean, recordsDeleted: number }> {
    return this.post('/api/sync/delete-ledger', { clientId })
  }

  // ==================== 记录 CRUD API ====================

  async createRecord(data: {
    clientId: string
    type: string
    amount: number
    category: string
    date: string
    note?: string
    ledgerId: string
  }): Promise<AccountRecord> {
    const result = await this.post<CloudRecord>('/api/records', data)
    return AccountRecord.fromJson({
      id: result.clientId,
      type: result.type,
      amount: result.amount,
      category: result.category,
      date: result.date,
      note: result.note,
      ledgerId: result.ledgerId,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      syncStatus: 'synced',
      serverId: result.serverId
    })
  }

  async updateRecord(clientId: string, data: {
    type?: string
    amount?: number
    category?: string
    date?: string
    note?: string
  }): Promise<AccountRecord> {
    const result = await this.put<CloudRecord>(`/api/records/${clientId}`, data)
    return AccountRecord.fromJson({
      id: result.clientId,
      type: result.type,
      amount: result.amount,
      category: result.category,
      date: result.date,
      note: result.note,
      ledgerId: result.ledgerId,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      syncStatus: 'synced',
      serverId: result.serverId
    })
  }

  async deleteRecord(clientId: string): Promise<{ deleted: boolean }> {
    return this.delete(`/api/records/${clientId}`)
  }

  async deleteRecords(clientIds: string[]): Promise<{ deleted: number }> {
    return this.post('/api/records/batch-delete', { clientIds })
  }
}

export const apiService = new ApiService()
