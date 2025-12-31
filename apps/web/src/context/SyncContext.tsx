import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import { syncService, SyncState, SyncResult, ConflictRecord } from '@/services/syncService'
import { apiClient } from '@/services/apiClient'

// 自动同步配置
const AUTO_SYNC_DELAY = 3000 // 变更后延迟 3 秒自动同步
const CONNECTION_CHECK_INTERVAL = 30000 // 每 30 秒检查连接
const RECONNECT_SYNC_DELAY = 1000 // 重连后延迟 1 秒同步

interface SyncContextType {
  // 状态
  syncState: SyncState
  isConnected: boolean
  isAuthenticated: boolean
  serverUrl: string | null
  lastSyncAt: string | null
  pendingCount: number
  autoSyncEnabled: boolean
  lastSyncResult: SyncResult | null
  
  // 操作
  discoverServer: (url: string) => Promise<boolean>
  login: (identifier: string) => Promise<boolean>
  sync: () => Promise<SyncResult>
  fullSync: () => Promise<SyncResult>
  checkConnection: () => Promise<void>
  disconnect: () => void
  setAutoSyncEnabled: (enabled: boolean) => void
  
  // 同步追踪（供 RecordsContext 调用）
  trackCreate: (record: unknown) => void
  trackUpdate: (id: string, data: unknown) => void
  trackDelete: (id: string) => void
}

export type { ConflictRecord }

const SyncContext = createContext<SyncContextType | undefined>(undefined)

export function SyncProvider({ children }: { children: ReactNode }) {
  const [syncState, setSyncState] = useState<SyncState>('idle')
  const [isConnected, setIsConnected] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [serverUrl, setServerUrl] = useState<string | null>(null)
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null)
  const [autoSyncEnabled, setAutoSyncEnabledState] = useState(() => {
    const saved = localStorage.getItem('pa_auto_sync')
    return saved !== 'false' // 默认开启
  })

  // 用于防抖的定时器引用
  const autoSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isSyncingRef = useRef(false)
  const wasOfflineRef = useRef(false)
  
  // 使用 ref 存储最新状态，避免 useEffect 依赖问题
  const stateRef = useRef({ isConnected, isAuthenticated, autoSyncEnabled })
  stateRef.current = { isConnected, isAuthenticated, autoSyncEnabled }

  // 执行自动同步（内部使用）- 使用 ref 获取最新状态
  const performAutoSync = useCallback(async () => {
    const { isConnected: connected, isAuthenticated: authenticated, autoSyncEnabled: autoSync } = stateRef.current
    
    if (isSyncingRef.current || !connected || !authenticated || !autoSync) {
      return
    }

    isSyncingRef.current = true
    setSyncState('syncing')

    try {
      const result = await syncService.sync()
      setLastSyncResult(result)
      
      if (result.success) {
        setSyncState('success')
        setLastSyncAt(syncService.getSyncMeta().lastSyncAt)
        setPendingCount(syncService.getPendingCount())
        setTimeout(() => setSyncState('idle'), 2000)
      } else {
        setSyncState('error')
        setTimeout(() => setSyncState('idle'), 3000)
      }
    } catch {
      setSyncState('error')
      setTimeout(() => setSyncState('idle'), 3000)
    } finally {
      isSyncingRef.current = false
    }
  }, [])

  // 触发延迟自动同步（防抖）
  const triggerAutoSync = useCallback(() => {
    const { isConnected: connected, isAuthenticated: authenticated, autoSyncEnabled: autoSync } = stateRef.current
    
    if (!autoSync || !connected || !authenticated) {
      return
    }

    // 清除之前的定时器
    if (autoSyncTimerRef.current) {
      clearTimeout(autoSyncTimerRef.current)
    }

    // 设置新的延迟同步
    autoSyncTimerRef.current = setTimeout(() => {
      performAutoSync()
    }, AUTO_SYNC_DELAY)
  }, [performAutoSync])

  // 设置自动同步开关
  const setAutoSyncEnabled = useCallback((enabled: boolean) => {
    setAutoSyncEnabledState(enabled)
    localStorage.setItem('pa_auto_sync', String(enabled))
  }, [])

  // 初始化：检查已保存的服务器连接
  useEffect(() => {
    const init = async () => {
      const meta = syncService.getSyncMeta()
      setLastSyncAt(meta.lastSyncAt)
      setPendingCount(syncService.getPendingCount())

      if (meta.serverUrl) {
        setServerUrl(meta.serverUrl)
        apiClient.setBaseUrl(meta.serverUrl)
        
        // 检查连接
        const connected = await syncService.checkConnection()
        setIsConnected(connected)
        
        // 检查 token
        const token = apiClient.getToken()
        setIsAuthenticated(!!token && connected)
        
        if (!connected) {
          setSyncState('offline')
        }
      }
    }

    init()
  }, [])

  // 定期检查连接状态
  useEffect(() => {
    if (!serverUrl) return

    const interval = setInterval(async () => {
      const connected = await syncService.checkConnection()
      const wasOffline = !stateRef.current.isConnected || wasOfflineRef.current
      
      setIsConnected(connected)
      
      if (!connected) {
        setSyncState('offline')
        wasOfflineRef.current = true
      } else {
        if (wasOffline && stateRef.current.isAuthenticated && stateRef.current.autoSyncEnabled) {
          // 网络恢复，自动同步
          wasOfflineRef.current = false
          setSyncState('idle')
          setTimeout(() => {
            if (syncService.getPendingCount() > 0) {
              performAutoSync()
            }
          }, RECONNECT_SYNC_DELAY)
        } else if (syncState === 'offline') {
          setSyncState('idle')
        }
      }
    }, CONNECTION_CHECK_INTERVAL)

    return () => clearInterval(interval)
  }, [serverUrl, syncState, performAutoSync])

  // 监听网络状态变化
  useEffect(() => {
    const handleOnline = async () => {
      if (serverUrl && stateRef.current.isAuthenticated && stateRef.current.autoSyncEnabled) {
        // 网络恢复，检查连接并同步
        const connected = await syncService.checkConnection()
        setIsConnected(connected)
        
        if (connected) {
          setSyncState('idle')
          setTimeout(() => {
            if (syncService.getPendingCount() > 0) {
              performAutoSync()
            }
          }, RECONNECT_SYNC_DELAY)
        }
      }
    }

    const handleOffline = () => {
      setIsConnected(false)
      setSyncState('offline')
      wasOfflineRef.current = true
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [serverUrl, performAutoSync])

  // 清理定时器
  useEffect(() => {
    return () => {
      if (autoSyncTimerRef.current) {
        clearTimeout(autoSyncTimerRef.current)
      }
    }
  }, [])

  // 发现并连接服务器
  const discoverServer = useCallback(async (url: string): Promise<boolean> => {
    setSyncState('checking')
    
    const success = await syncService.discoverServer(url)
    
    if (success) {
      setServerUrl(url)
      setIsConnected(true)
      setSyncState('idle')
    } else {
      setSyncState('error')
    }
    
    return success
  }, [])

  // 登录
  const login = useCallback(async (identifier: string): Promise<boolean> => {
    if (!stateRef.current.isConnected) return false
    
    const success = await syncService.devLogin(identifier)
    setIsAuthenticated(success)
    
    // 登录成功后，如果有待同步数据，自动同步
    if (success && stateRef.current.autoSyncEnabled && syncService.getPendingCount() > 0) {
      setTimeout(() => performAutoSync(), RECONNECT_SYNC_DELAY)
    }
    
    return success
  }, [performAutoSync])

  // 执行同步
  const sync = useCallback(async (): Promise<SyncResult> => {
    if (!stateRef.current.isConnected || !stateRef.current.isAuthenticated) {
      return { success: false, pulled: 0, pushed: 0, conflicts: 0, merged: 0, error: 'Not connected or authenticated' }
    }

    setSyncState('syncing')
    
    const result = await syncService.sync()
    setLastSyncResult(result)
    
    if (result.success) {
      setSyncState('success')
      setLastSyncAt(syncService.getSyncMeta().lastSyncAt)
      setPendingCount(syncService.getPendingCount())
      
      // 3 秒后恢复 idle 状态
      setTimeout(() => setSyncState('idle'), 3000)
    } else {
      setSyncState('error')
    }
    
    return result
  }, [])

  // 全量同步
  const fullSync = useCallback(async (): Promise<SyncResult> => {
    if (!stateRef.current.isConnected || !stateRef.current.isAuthenticated) {
      return { success: false, pulled: 0, pushed: 0, conflicts: 0, merged: 0, error: 'Not connected or authenticated' }
    }

    setSyncState('syncing')
    
    const result = await syncService.fullSync()
    setLastSyncResult(result)
    
    if (result.success) {
      setSyncState('success')
      setLastSyncAt(syncService.getSyncMeta().lastSyncAt)
      setPendingCount(0)
      setTimeout(() => setSyncState('idle'), 3000)
    } else {
      setSyncState('error')
    }
    
    return result
  }, [])

  // 检查连接
  const checkConnection = useCallback(async () => {
    if (!serverUrl) return
    
    setSyncState('checking')
    const connected = await syncService.checkConnection()
    setIsConnected(connected)
    setSyncState(connected ? 'idle' : 'offline')
  }, [serverUrl])

  // 断开连接
  const disconnect = useCallback(() => {
    syncService.clearSyncData()
    setServerUrl(null)
    setIsConnected(false)
    setIsAuthenticated(false)
    setLastSyncAt(null)
    setPendingCount(0)
    setSyncState('idle')
  }, [])

  // 追踪变更
  const trackCreate = useCallback((record: unknown) => {
    syncService.trackCreate(record as Parameters<typeof syncService.trackCreate>[0])
    setPendingCount(syncService.getPendingCount())
    // 触发自动同步
    triggerAutoSync()
  }, [triggerAutoSync])

  const trackUpdate = useCallback((id: string, data: unknown) => {
    syncService.trackUpdate(id, data as Parameters<typeof syncService.trackUpdate>[1])
    setPendingCount(syncService.getPendingCount())
    // 触发自动同步
    triggerAutoSync()
  }, [triggerAutoSync])

  const trackDelete = useCallback((id: string) => {
    syncService.trackDelete(id)
    setPendingCount(syncService.getPendingCount())
    // 触发自动同步
    triggerAutoSync()
  }, [triggerAutoSync])

  return (
    <SyncContext.Provider
      value={{
        syncState,
        isConnected,
        isAuthenticated,
        serverUrl,
        lastSyncAt,
        pendingCount,
        autoSyncEnabled,
        lastSyncResult,
        discoverServer,
        login,
        sync,
        fullSync,
        checkConnection,
        disconnect,
        setAutoSyncEnabled,
        trackCreate,
        trackUpdate,
        trackDelete,
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
