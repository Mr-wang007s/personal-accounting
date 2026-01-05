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
   * 微信云托管自动登录
   * @param nickname 用户昵称（可选）
   * @param avatar 用户头像（可选）
   */
  async autoLogin(nickname?: string, avatar?: string): Promise<{
    success: boolean
    user?: LoginResponse['user']
    isNewUser?: boolean
  }> {
    try {
      const result = await apiClient.wxCloudLogin(nickname, avatar)
      apiClient.setToken(result.accessToken)
      
      this.authState.isLoggedIn = true
      this.authState.user = result.user

      return { success: true, user: result.user, isNewUser: result.isNewUser }
    } catch (error) {
      console.error('[AuthService] 云托管登录失败:', error)
      return { success: false }
    }
  }

  /**
   * 登出
   */
  logout(): void {
    apiClient.clearToken()
    this.authState.isLoggedIn = false
    this.authState.user = null
  }

  /**
   * 检查云托管连接
   */
  async checkConnection(): Promise<boolean> {
    try {
      await apiClient.ping()
      return true
    } catch {
      return false
    }
  }
}

export const authService = new AuthService()
