/**
 * 同步上下文 - 简化版
 * 重构：移除本地存储同步逻辑，仅处理服务器连接和认证状态
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { apiClient, LoginResponse } from '@/services/apiClient'
import { ledgerService } from '@/services/ledgerService'
import { recordService } from '@/services/recordService'

// 存储键（仅保留必要的配置）
const SERVER_URL_KEY = 'pa_server_url'

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error'

interface SyncContextType {
  // 状态
  connectionState: ConnectionState
  isConnected: boolean
  isAuthenticated: boolean
  serverUrl: string | null
  userPhone: string | null
  error: string | null
  
  // 操作
  discoverServer: (url: string) => Promise<boolean>
  login: (phone: string, nickname?: string) => Promise<{ success: boolean; isNewUser: boolean }>
  disconnect: () => void
  refreshAllData: () => Promise<void>
}

const SyncContext = createContext<SyncContextType | undefined>(undefined)

export function SyncProvider({ children }: { children: ReactNode }) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected')
  const [isConnected, setIsConnected] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [serverUrl, setServerUrl] = useState<string | null>(null)
  const [userPhone, setUserPhone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 刷新所有数据
  const refreshAllData = useCallback(async () => {
    if (!isAuthenticated) return
    
    try {
      await ledgerService.refreshCache()
      await recordService.refreshCache()
    } catch (err) {
      console.error('[SyncContext] 刷新数据失败:', err)
    }
  }, [isAuthenticated])

  // 初始化
  useEffect(() => {
    const init = async () => {
      const savedUrl = localStorage.getItem(SERVER_URL_KEY)
      const profile = ledgerService.getUserProfile()
      
      if (savedUrl) {
        setServerUrl(savedUrl)
        apiClient.setBaseUrl(savedUrl)
        
        // 检查连接
        setConnectionState('connecting')
        try {
          await apiClient.ping(savedUrl)
          setIsConnected(true)
          setConnectionState('connected')
          
          // 检查认证
          if (apiClient.isAuthenticated()) {
            setIsAuthenticated(true)
            setUserPhone(profile?.phone || null)
          }
        } catch {
          setConnectionState('error')
          setIsConnected(false)
        }
      }
    }

    init()
  }, [])

  // 发现并连接服务器
  const discoverServer = useCallback(async (url: string): Promise<boolean> => {
    setConnectionState('connecting')
    setError(null)
    
    try {
      const normalizedUrl = url.replace(/\/$/, '')
      await apiClient.ping(normalizedUrl)
      
      // 保存服务器地址
      localStorage.setItem(SERVER_URL_KEY, normalizedUrl)
      apiClient.setBaseUrl(normalizedUrl)
      
      setServerUrl(normalizedUrl)
      setIsConnected(true)
      setConnectionState('connected')
      
      // 更新用户配置
      ledgerService.updateUserProfile({ serverUrl: normalizedUrl })
      
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : '连接服务器失败')
      setConnectionState('error')
      return false
    }
  }, [])

  // 登录
  const login = useCallback(async (phone: string, nickname?: string): Promise<{ success: boolean; isNewUser: boolean }> => {
    setError(null)
    
    try {
      const result: LoginResponse = await apiClient.phoneLogin(phone, nickname)
      apiClient.setToken(result.accessToken)
      
      setIsAuthenticated(true)
      setUserPhone(phone)
      
      // 更新用户配置
      const existingProfile = ledgerService.getUserProfile()
      if (existingProfile) {
        ledgerService.updateUserProfile({ phone })
      } else {
        ledgerService.createUserProfile(nickname || '用户', phone)
      }
      
      return { success: true, isNewUser: result.isNewUser }
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败')
      return { success: false, isNewUser: false }
    }
  }, [])

  // 断开连接
  const disconnect = useCallback(() => {
    localStorage.removeItem(SERVER_URL_KEY)
    apiClient.clearToken()
    
    // 清除服务缓存
    ledgerService.clearCache()
    recordService.clearCache()
    
    setServerUrl(null)
    setIsConnected(false)
    setIsAuthenticated(false)
    setUserPhone(null)
    setConnectionState('disconnected')
  }, [])

  return (
    <SyncContext.Provider
      value={{
        connectionState,
        isConnected,
        isAuthenticated,
        serverUrl,
        userPhone,
        error,
        discoverServer,
        login,
        disconnect,
        refreshAllData,
      }}
    >
      {children}
    </SyncContext.Provider>
  )
}

export function useSync() {
  const context = useContext(SyncContext)
  if (context === undefined) {
    throw new Error('useSync must be used within a SyncProvider')
  }
  return context
}
