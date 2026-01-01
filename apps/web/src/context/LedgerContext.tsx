import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import type { Ledger, UserProfile } from '@personal-accounting/shared/types'
import { ledgerService } from '@/services/ledgerService'
import { syncService } from '@/services/syncService'

interface LedgerContextType {
  // 状态
  isInitialized: boolean
  userProfile: UserProfile | null
  ledgers: Ledger[]
  currentLedger: Ledger | null
  
  // 操作
  initialize: (nickname: string, ledgerName?: string) => void
  createLedger: (name: string, icon?: string, color?: string) => Ledger
  updateLedger: (id: string, data: Partial<Omit<Ledger, 'id' | 'createdAt'>>) => void
  deleteLedger: (id: string) => boolean
  switchLedger: (ledgerId: string) => void
  updateNickname: (nickname: string) => void
  refreshData: () => void
}

const LedgerContext = createContext<LedgerContextType | undefined>(undefined)

export function LedgerProvider({ children }: { children: ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [ledgers, setLedgers] = useState<Ledger[]>([])
  const [currentLedger, setCurrentLedger] = useState<Ledger | null>(null)

  const refreshData = useCallback(() => {
    const profile = ledgerService.getUserProfile()
    const allLedgers = ledgerService.getLedgers()
    const current = ledgerService.getCurrentLedger()
    
    setUserProfile(profile)
    setLedgers(allLedgers)
    setCurrentLedger(current)
    setIsInitialized(ledgerService.isInitialized())
  }, [])

  useEffect(() => {
    refreshData()
  }, [refreshData])

  const initialize = useCallback((nickname: string, ledgerName?: string) => {
    ledgerService.initialize(nickname, ledgerName)
    refreshData()
  }, [refreshData])

  const createLedger = useCallback((name: string, icon?: string, color?: string): Ledger => {
    const ledger = ledgerService.createLedger(name, icon, color)
    refreshData()
    
    // 如果已连接云端，自动同步新账本
    if (syncService.isConnected()) {
      syncService.syncNewLedger(ledger).catch(err => {
        console.error('[Ledger] 同步新账本失败:', err)
      })
    }
    
    return ledger
  }, [refreshData])

  const updateLedger = useCallback((id: string, data: Partial<Omit<Ledger, 'id' | 'createdAt'>>) => {
    ledgerService.updateLedger(id, data)
    refreshData()
    
    // 如果已连接云端，触发同步
    if (syncService.isConnected()) {
      syncService.triggerAutoSync()
    }
  }, [refreshData])

  const deleteLedger = useCallback((id: string): boolean => {
    // 不能删除最后一个账本
    if (ledgers.length <= 1) return false
    
    const success = ledgerService.deleteLedger(id)
    if (success) {
      // 如果删除的是当前账本，切换到第一个
      if (currentLedger?.id === id) {
        const remaining = ledgers.filter(l => l.id !== id)
        if (remaining.length > 0) {
          ledgerService.switchLedger(remaining[0].id)
        }
      }
      refreshData()
    }
    return success
  }, [ledgers, currentLedger, refreshData])

  const switchLedger = useCallback((ledgerId: string) => {
    ledgerService.switchLedger(ledgerId)
    refreshData()
  }, [refreshData])

  const updateNickname = useCallback((nickname: string) => {
    ledgerService.updateUserProfile({ nickname })
    refreshData()
  }, [refreshData])

  return (
    <LedgerContext.Provider
      value={{
        isInitialized,
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
