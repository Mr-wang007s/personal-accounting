import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import { syncService, SyncState, SyncResult } from '@/services/syncService'
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
  pendingBackupCount: number // 待备份数量
  autoSyncEnabled: boolean
  lastSyncResult: SyncResult | null
  
  // 操作
  discoverServer: (url: string) => Promise<boolean>
  login: (identifier: string, nickname?: string) => Promise<boolean>
  sync: () => Promise<SyncResult>
  checkConnection: () => Promise<void>
  disconnect: () => void
  setAutoSyncEnabled: (enabled: boolean) => void
  
  // 记录操作（简化版）
  markRecordForSync: (id: string) => void
  deleteRecord: (id: string, deleteFromCloud: boolean) => Promise<boolean>
  isRecordSynced: (id: string) => boolean
  triggerAutoSync: () => void
}

const SyncContext = createContext<SyncContextType | undefined>(undefined)

export function SyncProvider({ children }: { children: ReactNode }) {
  const [syncState, setSyncState] = useState<SyncState>('idle')
  const [isConnected, setIsConnected] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [serverUrl, setServerUrl] = useState<string | null>(null)
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)
  const [pendingBackupCount, setPendingBackupCount] = useState(0)
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null)
  const [autoSyncEnabled, setAutoSyncEnabledState] = useState(() => {
    const saved = localStorage.getItem('pa_auto_sync')
    return saved !== 'false' // 默认开启
  })

  // 用于防抖的定时器引用
  const autoSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isSyncingRef = useRef(false)
  const wasOfflineRef = useRef(false)
  
  // 使用 ref 存储最新状态
  const stateRef = useRef({ isConnected, isAuthenticated, autoSyncEnabled })
  stateRef.current = { isConnected, isAuthenticated, autoSyncEnabled }

  // 更新待备份数量
  const updatePendingCount = useCallback(() => {
    setPendingBackupCount(syncService.getPendingBackupCount())
  }, [])

  // 执行同步
  const performSync = useCallback(async () => {
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
        updatePendingCount()
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
  }, [updatePendingCount])

  // 触发延迟自动同步（防抖）
  const triggerAutoSync = useCallback(() => {
    const { isConnected: connected, isAuthenticated: authenticated, autoSyncEnabled: autoSync } = stateRef.current
    
    if (!autoSync || !connected || !authenticated) {
      return
    }

    if (autoSyncTimerRef.current) {
      clearTimeout(autoSyncTimerRef.current)
    }

    autoSyncTimerRef.current = setTimeout(() => {
      performSync()
    }, AUTO_SYNC_DELAY)
  }, [performSync])

  // 设置自动同步开关
  const setAutoSyncEnabled = useCallback((enabled: boolean) => {
    setAutoSyncEnabledState(enabled)
    localStorage.setItem('pa_auto_sync', String(enabled))
    syncService.setAutoSync(enabled)
  }, [])

  // 初始化
  useEffect(() => {
    const init = async () => {
      const meta = syncService.getSyncMeta()
      setLastSyncAt(meta.lastSyncAt)
      updatePendingCount()

      if (meta.serverUrl) {
        setServerUrl(meta.serverUrl)
        apiClient.setBaseUrl(meta.serverUrl)
        
        const connected = await syncService.checkConnection()
        setIsConnected(connected)
        
        const token = apiClient.getToken()
        setIsAuthenticated(!!token && connected)
        
        if (!connected) {
          setSyncState('offline')
        }
      }
    }

    init()
  }, [updatePendingCount])

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
          wasOfflineRef.current = false
          setSyncState('idle')
          setTimeout(() => {
            if (syncService.getPendingBackupCount() > 0) {
              performSync()
            }
          }, RECONNECT_SYNC_DELAY)
        } else if (syncState === 'offline') {
          setSyncState('idle')
        }
      }
    }, CONNECTION_CHECK_INTERVAL)

    return () => clearInterval(interval)
  }, [serverUrl, syncState, performSync])

  // 监听网络状态变化
  useEffect(() => {
    const handleOnline = async () => {
      if (serverUrl && stateRef.current.isAuthenticated && stateRef.current.autoSyncEnabled) {
        const connected = await syncService.checkConnection()
        setIsConnected(connected)
        
        if (connected) {
          setSyncState('idle')
          setTimeout(() => {
            if (syncService.getPendingBackupCount() > 0) {
              performSync()
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
  }, [serverUrl, performSync])

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
    setSyncState('syncing')
    
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
  const login = useCallback(async (identifier: string, nickname?: string): Promise<boolean> => {
    const success = await syncService.login(identifier, nickname)
    setIsAuthenticated(success)
    
    if (success && stateRef.current.autoSyncEnabled && syncService.getPendingBackupCount() > 0) {
      setTimeout(() => performSync(), RECONNECT_SYNC_DELAY)
    }
    
    return success
  }, [performSync])

  // 手动同步
  const sync = useCallback(async (): Promise<SyncResult> => {
    if (!stateRef.current.isConnected || !stateRef.current.isAuthenticated) {
      return { success: false, uploaded: 0, downloaded: 0, error: '未连接或未登录' }
    }

    setSyncState('syncing')
    
    const result = await syncService.sync()
    setLastSyncResult(result)
    
    if (result.success) {
      setSyncState('success')
      setLastSyncAt(syncService.getSyncMeta().lastSyncAt)
      updatePendingCount()
      setTimeout(() => setSyncState('idle'), 3000)
    } else {
      setSyncState('error')
    }
    
    return result
  }, [updatePendingCount])

  // 检查连接
  const checkConnection = useCallback(async () => {
    if (!serverUrl) return
    
    setSyncState('syncing')
    const connected = await syncService.checkConnection()
    setIsConnected(connected)
    setSyncState(connected ? 'idle' : 'offline')
  }, [serverUrl])

  // 断开连接
  const disconnect = useCallback(() => {
    syncService.disconnect()
    setServerUrl(null)
    setIsConnected(false)
    setIsAuthenticated(false)
    setLastSyncAt(null)
    setPendingBackupCount(0)
    setSyncState('idle')
  }, [])

  // 标记记录需要重新同步
  const markRecordForSync = useCallback((id: string) => {
    syncService.markRecordForSync(id)
    updatePendingCount()
    triggerAutoSync()
  }, [updatePendingCount, triggerAutoSync])

  // 删除记录
  const deleteRecord = useCallback(async (id: string, deleteFromCloud: boolean): Promise<boolean> => {
    const success = await syncService.deleteRecord(id, deleteFromCloud)
    if (success) {
      updatePendingCount()
    }
    return success
  }, [updatePendingCount])

  // 检查记录是否已同步
  const isRecordSynced = useCallback((id: string): boolean => {
    return syncService.isRecordSynced(id)
  }, [])

  return (
    <SyncContext.Provider
      value={{
        syncState,
        isConnected,
        isAuthenticated,
        serverUrl,
        lastSyncAt,
        pendingBackupCount,
        autoSyncEnabled,
        lastSyncResult,
        discoverServer,
        login,
        sync,
        checkConnection,
        disconnect,
        setAutoSyncEnabled,
        markRecordForSync,
        deleteRecord,
        isRecordSynced,
        triggerAutoSync,
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
