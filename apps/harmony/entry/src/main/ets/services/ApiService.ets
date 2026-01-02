/**
 * API 服务 - HTTP 客户端
 */
import { http } from '@kit.NetworkKit'

interface ApiResponse<T> {
  code: number
  message: string
  data: T
  timestamp: string
}

class ApiService {
  private baseUrl: string = ''
  private token: string = ''

  setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/$/, '')
  }

  setToken(token: string): void {
    this.token = token
  }

  getToken(): string {
    return this.token
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
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

  // 健康检查
  async ping(): Promise<boolean> {
    try {
      await this.get('/api/discovery/ping')
      return true
    } catch {
      return false
    }
  }
}

export const apiService = new ApiService()
