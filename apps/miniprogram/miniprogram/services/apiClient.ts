/**
 * API 客户端 - 用于与后端通信
 * 微信云托管版本 - 使用 wx.cloud.callContainer
 */

/// <reference path="../typings/wx.d.ts" />

// 云托管配置
const CLOUD_CONFIG = {
  env: 'prod-5gqmub7sd1872233',
  service: 'express-g8es',
}

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
  serverId: string
  clientId: string
  name: string
  icon?: string
  color?: string
  createdAt: string
  updatedAt: string
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

// 备份账本请求
export interface BackupLedger {
  clientId: string
  name: string
  icon?: string
  color?: string
  createdAt: string
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

// 账本备份响应
export interface BackupLedgersResponse {
  success: boolean
  uploaded: number
  ledgers: Array<{
    clientId: string
    serverId: string
  }>
  errors?: Array<{
    clientId: string
    error: string
  }>
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

// 微信云托管用户信息（从请求头自动获取）
export interface WxCloudUserInfo {
  openid: string
  unionid?: string
  nickname?: string
  phone?: string
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

  // 兼容旧代码，但云托管不需要设置 baseUrl
  setBaseUrl(_url: string): void {
    // 云托管模式下不需要设置 baseUrl
    console.log('[ApiClient] 云托管模式，忽略 setBaseUrl')
  }

  getBaseUrl(): string | null {
    // 返回云托管标识
    return `cloudrun://${CLOUD_CONFIG.service}`
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

  // 云托管模式始终已配置
  isConfigured(): boolean {
    return true
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
            // 检查返回数据格式
            const responseData = res.data
            if (responseData && typeof responseData === 'object' && 'data' in responseData) {
              // 标准 ApiResponse 格式
              resolve((responseData as ApiResponse<T>).data)
            } else {
              // 直接返回数据
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

  // 服务发现 - ping 检查（云托管模式）
  ping(_url?: string): Promise<PingResponse> {
    return this.request<PingResponse>('/api/discovery/ping', {
      method: 'GET',
    })
  }

  /**
   * 微信云托管自动登录
   * 云托管会自动在请求头中注入用户的 openid 等信息
   * 如果云托管未注入 openid，可以传入 code 通过 code2Session 获取
   * @param nickname 用户昵称（从微信获取）
   * @param avatar 用户头像（从微信获取）
   * @param code wx.login 获取的临时登录凭证（可选）
   */
  async wxCloudLogin(nickname?: string, avatar?: string, code?: string): Promise<LoginResponse> {
    return this.request('/api/auth/wx-cloud/login', {
      method: 'POST',
      data: { nickname, avatar, code },
    })
  }

  /**
   * 标准微信登录（使用 code2Session）
   * @param code wx.login 获取的临时登录凭证
   * @param nickname 用户昵称
   * @param avatar 用户头像
   */
  async wechatLogin(code: string, nickname?: string, avatar?: string): Promise<LoginResponse> {
    return this.request('/api/auth/wechat/login', {
      method: 'POST',
      data: { code, nickname, avatar },
    })
  }

  /**
   * 获取当前用户信息（云托管模式）
   * 后端根据请求头中的 openid 返回用户信息
   */
  async getCurrentUser(): Promise<LoginResponse['user']> {
    return this.request('/api/auth/me', {
      method: 'GET',
    })
  }

  // 手机号登录（保留兼容）
  async phoneLogin(phone: string, nickname?: string): Promise<LoginResponse> {
    return this.request('/api/auth/phone/login', {
      method: 'POST',
      data: { phone, nickname },
    })
  }

  // ==================== 新版简化 API ====================

  /**
   * 备份账本：上传本地账本到云端
   */
  async backupLedgers(ledgers: BackupLedger[]): Promise<BackupLedgersResponse> {
    return this.request('/api/sync/backup-ledgers', {
      method: 'POST',
      data: { ledgers },
    })
  }

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
