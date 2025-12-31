import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { syncService, SyncState, SyncResult } from '@/services/syncService'
import { apiClient } from '@/services/apiClient'

interface SyncContextType {
  // 状态
  syncState: SyncState
  isConnected: boolean
  isAuthenticated: boolean
  serverUrl: string | null
  lastSyncAt: string | null
  pendingCount: number
  
  // 操作
  discoverServer: (url: string) => Promise<boolean>
  login: (identifier: string) => Promise<boolean>
  sync: () => Promise<SyncResult>
  fullSync: () => Promise<SyncResult>
  checkConnection: () => Promise<void>
  disconnect: () => void
  
  // 同步追踪（供 RecordsContext 调用）
  trackCreate: (record: unknown) => void
  trackUpdate: (id: string, data: unknown) => void
  trackDelete: (id: string) => void
}

const SyncContext = createContext<SyncContextType | undefined>(undefined)

export function SyncProvider({ children }: { children: ReactNode }) {
  const [syncState, setSyncState] = useState<SyncState>('idle')
  const [isConnected, setIsConnected] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [serverUrl, setServerUrl] = useState<string | null>(null)
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)
  const [pendingCount, setPendingCount] = useState(0)

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
      setIsConnected(connected)
      
      if (!connected) {
        setSyncState('offline')
      } else if (syncState === 'offline') {
        setSyncState('idle')
      }
    }, 30000) // 每 30 秒检查一次

    return () => clearInterval(interval)
  }, [serverUrl, syncState])

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
    if (!isConnected) return false
    
    const success = await syncService.devLogin(identifier)
    setIsAuthenticated(success)
    return success
  }, [isConnected])

  // 执行同步
  const sync = useCallback(async (): Promise<SyncResult> => {
    if (!isConnected || !isAuthenticated) {
      return { success: false, pulled: 0, pushed: 0, conflicts: 0, error: 'Not connected or authenticated' }
    }

    setSyncState('syncing')
    
    const result = await syncService.sync()
    
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
  }, [isConnected, isAuthenticated])

  // 全量同步
  const fullSync = useCallback(async (): Promise<SyncResult> => {
    if (!isConnected || !isAuthenticated) {
      return { success: false, pulled: 0, pushed: 0, conflicts: 0, error: 'Not connected or authenticated' }
    }

    setSyncState('syncing')
    
    const result = await syncService.fullSync()
    
    if (result.success) {
      setSyncState('success')
      setLastSyncAt(syncService.getSyncMeta().lastSyncAt)
      setPendingCount(0)
      setTimeout(() => setSyncState('idle'), 3000)
    } else {
      setSyncState('error')
    }
    
    return result
  }, [isConnected, isAuthenticated])

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
  }, [])

  const trackUpdate = useCallback((id: string, data: unknown) => {
    syncService.trackUpdate(id, data as Parameters<typeof syncService.trackUpdate>[1])
    setPendingCount(syncService.getPendingCount())
  }, [])

  const trackDelete = useCallback((id: string) => {
    syncService.trackDelete(id)
    setPendingCount(syncService.getPendingCount())
  }, [])

  return (
    <SyncContext.Provider
      value={{
        syncState,
        isConnected,
        isAuthenticated,
        serverUrl,
        lastSyncAt,
        pendingCount,
        discoverServer,
        login,
        sync,
        fullSync,
        checkConnection,
        disconnect,
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
