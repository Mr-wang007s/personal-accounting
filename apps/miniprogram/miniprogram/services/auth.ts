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
const USER_EMAIL_KEY = 'pa_user_email'

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
   * 获取保存的邮箱
   */
  getSavedEmail(): string | null {
    return wx.getStorageSync(USER_EMAIL_KEY) || null
  }

  /**
   * 发送邮箱验证码
   * @param email 邮箱地址
   */
  async sendEmailCode(email: string): Promise<{
    success: boolean
    message?: string
    error?: string
  }> {
    try {
      const result = await apiClient.sendEmailCode(email)
      return { success: result.success, message: result.message }
    } catch (error) {
      console.error('[AuthService] 发送验证码失败:', error)
      return { success: false, error: (error as Error).message }
    }
  }

  /**
   * 邮箱验证码登录
   * @param email 邮箱地址
   * @param code 验证码
   * @param nickname 用户昵称（可选）
   */
  async emailLogin(email: string, code: string, nickname?: string): Promise<{
    success: boolean
    user?: LoginResponse['user']
    isNewUser?: boolean
    error?: string
  }> {
    try {
      const result = await apiClient.emailLogin(email, code, nickname)
      apiClient.setToken(result.accessToken)
      
      // 保存邮箱用于下次自动登录
      wx.setStorageSync(USER_EMAIL_KEY, email)
      
      this.authState.isLoggedIn = true
      this.authState.user = result.user

      return { success: true, user: result.user, isNewUser: result.isNewUser }
    } catch (error) {
      console.error('[AuthService] 邮箱登录失败:', error)
      return { success: false, error: (error as Error).message }
    }
  }

  /**
   * 邮箱登录（开发/测试用，无验证码）
   * @param email 邮箱地址
   * @param nickname 用户昵称（可选）
   */
  async phoneLogin(email: string, nickname?: string): Promise<{
    success: boolean
    user?: LoginResponse['user']
    isNewUser?: boolean
    error?: string
  }> {
    try {
      const result = await apiClient.phoneLogin(email, nickname)
      apiClient.setToken(result.accessToken)
      
      // 保存邮箱用于下次自动登录
      wx.setStorageSync(USER_EMAIL_KEY, email)
      
      this.authState.isLoggedIn = true
      this.authState.user = result.user

      return { success: true, user: result.user, isNewUser: result.isNewUser }
    } catch (error) {
      console.error('[AuthService] 邮箱登录失败:', error)
      return { success: false, error: (error as Error).message }
    }
  }

  /**
   * 自动登录（使用保存的邮箱）
   */
  async autoLogin(): Promise<{
    success: boolean
    user?: LoginResponse['user']
  }> {
    const savedEmail = this.getSavedEmail()
    if (!savedEmail) {
      return { success: false }
    }

    try {
      const result = await apiClient.phoneLogin(savedEmail)
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
    wx.removeStorageSync(USER_EMAIL_KEY)
    this.authState.isLoggedIn = false
    this.authState.user = null
  }
}

export const authService = new AuthService()
