/**
 * 认证上下文 - 管理登录状态
 * 简化版：移除自动同步、本地存储等功能，直接使用 API
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { apiClient, LoginResponse } from '@/services/apiClient'

interface AuthContextType {
  // 状态
  isAuthenticated: boolean
  isLoading: boolean
  user: LoginResponse['user'] | null
  error: string | null
  
  // 操作
  login: (phone: string) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function SyncProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<LoginResponse['user'] | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 初始化 - 检查登录状态
  useEffect(() => {
    const init = async () => {
      setIsLoading(true)
      
      if (apiClient.isAuthenticated()) {
        try {
          // 验证 token 有效性
          await apiClient.getLedgers()
          setIsAuthenticated(true)
        } catch {
          // Token 无效，清除
          apiClient.clearToken()
          setIsAuthenticated(false)
        }
      }
      
      setIsLoading(false)
    }

    init()
  }, [])

  // 登录
  const login = useCallback(async (phone: string): Promise<boolean> => {
    setError(null)
    setIsLoading(true)
    
    try {
      const result: LoginResponse = await apiClient.phoneLogin(phone)
      apiClient.setToken(result.accessToken)
      setUser(result.user)
      setIsAuthenticated(true)
      setIsLoading(false)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败')
      setIsLoading(false)
      return false
    }
  }, [])

  // 登出
  const logout = useCallback(() => {
    apiClient.clearToken()
    localStorage.removeItem('pa_current_ledger_id')
    setIsAuthenticated(false)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        error,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useSync() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useSync must be used within a SyncProvider')
  }
  return context
}

// 兼容旧代码的别名
export const useAuth = useSync
