/**
 * 认证服务 - 处理登录和用户状态
 * 
 * 注意：token 存储在 apiClient 中管理，这里只维护用户状态
 */

import { apiClient, LoginResponse } from './apiClient'

export interface AuthState {
  isLoggedIn: boolean
  user: LoginResponse['user'] | null
}

// 存储键
const USER_PHONE_KEY = 'pa_user_phone'

class AuthService {
  private authState: AuthState = {
    isLoggedIn: false,
    user: null,
  }

  constructor() {
    // 通过 apiClient 检查是否已认证
    if (apiClient.isAuthenticated()) {
      this.authState.isLoggedIn = true
    }
  }

  /**
   * 获取认证状态
   */
  getAuthState(): AuthState {
    return { ...this.authState }
  }

  /**
   * 是否已登录
   */
  isLoggedIn(): boolean {
    return apiClient.isAuthenticated()
  }

  /**
   * 获取保存的手机号
   */
  getSavedPhone(): string | null {
    return wx.getStorageSync(USER_PHONE_KEY) || null
  }

  /**
   * 手机号登录
   * @param phone 手机号
   * @param nickname 用户昵称（可选）
   */
  async phoneLogin(phone: string, nickname?: string): Promise<{
    success: boolean
    user?: LoginResponse['user']
    isNewUser?: boolean
    error?: string
  }> {
    try {
      const result = await apiClient.phoneLogin(phone, nickname)
      apiClient.setToken(result.accessToken)
      
      // 保存手机号用于下次自动登录
      wx.setStorageSync(USER_PHONE_KEY, phone)
      
      this.authState.isLoggedIn = true
      this.authState.user = result.user

      return { success: true, user: result.user, isNewUser: result.isNewUser }
    } catch (error) {
      console.error('[AuthService] 手机号登录失败:', error)
      return { success: false, error: (error as Error).message }
    }
  }

  /**
   * 自动登录（使用保存的手机号）
   */
  async autoLogin(): Promise<{
    success: boolean
    user?: LoginResponse['user']
  }> {
    const savedPhone = this.getSavedPhone()
    if (!savedPhone) {
      return { success: false }
    }

    try {
      const result = await apiClient.phoneLogin(savedPhone)
      apiClient.setToken(result.accessToken)
      
      this.authState.isLoggedIn = true
      this.authState.user = result.user

      return { success: true, user: result.user }
    } catch (error) {
      console.error('[AuthService] 自动登录失败:', error)
      return { success: false }
    }
  }

  /**
   * 登出
   */
  logout(): void {
    apiClient.clearToken()
    wx.removeStorageSync(USER_PHONE_KEY)
    this.authState.isLoggedIn = false
    this.authState.user = null
  }
}

export const authService = new AuthService()
