import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import type { Ledger, UserProfile } from '@personal-accounting/shared/types'
import { ledgerService } from '@/services/ledgerService'
import { apiClient } from '@/services/apiClient'

interface LedgerContextType {
  // 状态
  isInitialized: boolean
  isLoading: boolean
  error: string | null
  userProfile: UserProfile | null
  ledgers: Ledger[]
  currentLedger: Ledger | null
  
  // 操作
  initialize: (nickname: string, ledgerName?: string) => Promise<void>
  createLedger: (name: string, icon?: string, color?: string) => Promise<Ledger>
  updateLedger: (id: string, data: Partial<Omit<Ledger, 'id' | 'createdAt'>>) => Promise<void>
  deleteLedger: (id: string) => Promise<boolean>
  switchLedger: (ledgerId: string) => void
  updateNickname: (nickname: string) => void
  refreshData: () => Promise<void>
}

const LedgerContext = createContext<LedgerContextType | undefined>(undefined)

export function LedgerProvider({ children }: { children: ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [ledgers, setLedgers] = useState<Ledger[]>([])
  const [currentLedger, setCurrentLedger] = useState<Ledger | null>(null)

  const refreshData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // 从本地获取用户配置
      const profile = ledgerService.getUserProfile()
      setUserProfile(profile)
      
      // 如果已认证，从云端获取账本
      if (apiClient.isAuthenticated()) {
        await ledgerService.refreshCache()
        const allLedgers = await ledgerService.getLedgers()
        setLedgers(allLedgers)
        
        // 获取当前账本
        const currentId = ledgerService.getCurrentLedgerId()
        if (currentId) {
          const current = allLedgers.find(l => l.id === currentId)
          setCurrentLedger(current || allLedgers[0] || null)
        } else if (allLedgers.length > 0) {
          setCurrentLedger(allLedgers[0])
          ledgerService.setCurrentLedgerId(allLedgers[0].id)
        }
      }
      
      setIsInitialized(ledgerService.isInitialized())
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败')
      console.error('[LedgerContext] 刷新数据失败:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshData()
  }, [refreshData])

  const initialize = useCallback(async (nickname: string, ledgerName?: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const { profile, ledger } = await ledgerService.initialize(nickname, ledgerName)
      setUserProfile(profile)
      setLedgers([ledger])
      setCurrentLedger(ledger)
      setIsInitialized(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '初始化失败')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createLedger = useCallback(async (name: string, icon?: string, color?: string): Promise<Ledger> => {
    try {
      const ledger = await ledgerService.createLedger(name, icon, color)
      await refreshData()
      return ledger
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建账本失败')
      throw err
    }
  }, [refreshData])

  const updateLedger = useCallback(async (id: string, data: Partial<Omit<Ledger, 'id' | 'createdAt'>>) => {
    try {
      await ledgerService.updateLedger(id, data)
      await refreshData()
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新账本失败')
      throw err
    }
  }, [refreshData])

  const deleteLedger = useCallback(async (id: string): Promise<boolean> => {
    // 不能删除最后一个账本
    if (ledgers.length <= 1) return false
    
    try {
      const success = await ledgerService.deleteLedger(id)
      if (success) {
        // 如果删除的是当前账本，切换到第一个
        if (currentLedger?.id === id) {
          const remaining = ledgers.filter(l => l.id !== id)
          if (remaining.length > 0) {
            ledgerService.switchLedger(remaining[0].id)
          }
        }
        await refreshData()
      }
      return success
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除账本失败')
      return false
    }
  }, [ledgers, currentLedger, refreshData])

  const switchLedger = useCallback((ledgerId: string) => {
    const ledger = ledgers.find(l => l.id === ledgerId)
    if (ledger) {
      ledgerService.switchLedger(ledgerId)
      setCurrentLedger(ledger)
    }
  }, [ledgers])

  const updateNickname = useCallback((nickname: string) => {
    ledgerService.updateUserProfile({ nickname })
    setUserProfile(prev => prev ? { ...prev, nickname } : null)
  }, [])

  return (
    <LedgerContext.Provider
      value={{
        isInitialized,
        isLoading,
        error,
        userProfile,
        ledgers,
        currentLedger,
        initialize,
        createLedger,
        updateLedger,
        deleteLedger,
        switchLedger,
        updateNickname,
        refreshData,
      }}
    >
      {children}
    </LedgerContext.Provider>
  )
}

export function useLedger() {
  const context = useContext(LedgerContext)
  if (context === undefined) {
    throw new Error('useLedger must be used within a LedgerProvider')
  }
  return context
}
