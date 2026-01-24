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
   * 自动登录（优先使用已存储的 token，支持自动刷新）
   */
  async autoLogin(): Promise<{
    success: boolean
    user?: LoginResponse['user']
  }> {
    // 检查是否有已存储的 token
    if (!apiClient.isAuthenticated()) {
      return { success: false }
    }

    // 1. 检查 token 是否已过期
    if (apiClient.isTokenExpired()) {
      console.log('[AuthService] Token 已过期')
      apiClient.clearToken()
      return { success: false }
    }

    // 2. 检查是否需要刷新（距离过期不足1天）
    if (apiClient.shouldRefreshToken()) {
      console.log('[AuthService] Token 即将过期，尝试刷新...')
      try {
        const refreshResult = await apiClient.refreshToken()
        apiClient.setToken(refreshResult.accessToken)
        this.authState.isLoggedIn = true
        this.authState.user = refreshResult.user
        console.log('[AuthService] Token 刷新成功')
        return { success: true, user: refreshResult.user }
      } catch (error) {
        console.log('[AuthService] Token 刷新失败，尝试验证现有 token')
        // 刷新失败，继续尝试使用现有 token
      }
    }

    // 3. 验证 token 是否有效
    try {
      const user = await apiClient.getCurrentUser()
      this.authState.isLoggedIn = true
      this.authState.user = user
      console.log('[AuthService] Token 有效，自动登录成功')
      return { success: true, user }
    } catch (error) {
      // Token 无效，清除
      console.log('[AuthService] Token 验证失败，清除 token')
      apiClient.clearToken()
      return { success: false }
    }
  }

  /**
   * 手动刷新 token
   */
  async refreshToken(): Promise<{
    success: boolean
    user?: LoginResponse['user']
    error?: string
  }> {
    try {
      const result = await apiClient.refreshToken()
      apiClient.setToken(result.accessToken)
      
      this.authState.isLoggedIn = true
      this.authState.user = result.user

      return { success: true, user: result.user }
    } catch (error) {
      console.error('[AuthService] 刷新 Token 失败:', error)
      return { success: false, error: (error as Error).message }
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
