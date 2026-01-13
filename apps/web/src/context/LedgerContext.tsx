/**
 * 账本上下文 - 管理账本状态
 * 依赖 SyncContext 的认证状态
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import type { Ledger } from '@personal-accounting/shared/types'
import { apiClient, CloudLedger } from '@/services/apiClient'
import { useSync } from './SyncContext'

interface LedgerContextType {
  ledgers: Ledger[]
  currentLedger: Ledger | null
  isLoading: boolean
  error: string | null
  
  createLedger: (name: string, icon?: string, color?: string) => Promise<Ledger>
  updateLedger: (id: string, data: Partial<Omit<Ledger, 'id' | 'createdAt'>>) => Promise<void>
  deleteLedger: (id: string) => Promise<boolean>
  switchLedger: (ledgerId: string) => void
  refreshLedgers: () => Promise<void>
}

const CURRENT_LEDGER_KEY = 'pa_current_ledger_id'

const LedgerContext = createContext<LedgerContextType | undefined>(undefined)

// 将云端账本转换为本地账本格式
function cloudToLocal(cloud: CloudLedger): Ledger {
  return {
    id: cloud.id,
    name: cloud.name,
    icon: cloud.icon,
    color: cloud.color,
    createdAt: cloud.createdAt,
    updatedAt: cloud.updatedAt,
  }
}

export function LedgerProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useSync()
  const [ledgers, setLedgers] = useState<Ledger[]>([])
  const [currentLedger, setCurrentLedger] = useState<Ledger | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshLedgers = useCallback(async () => {
    if (!apiClient.isAuthenticated()) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const cloudLedgers = await apiClient.getLedgers()
      let localLedgers = cloudLedgers.map(cloudToLocal)
      
      // 如果没有账本，自动创建默认账本
      if (localLedgers.length === 0) {
        const clientId = `ledger_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
        const newLedger = await apiClient.createLedger({
          clientId,
          name: '我的账本',
          icon: '📒',
          color: '#6366F1',
        })
        localLedgers = [cloudToLocal(newLedger)]
      }
      
      setLedgers(localLedgers)
      
      // 设置当前账本
      const savedId = localStorage.getItem(CURRENT_LEDGER_KEY)
      const target = savedId 
        ? localLedgers.find(l => l.id === savedId) 
        : localLedgers[0]
      
      if (target) {
        setCurrentLedger(target)
        localStorage.setItem(CURRENT_LEDGER_KEY, target.id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载账本失败')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 监听认证状态变化
  useEffect(() => {
    if (isAuthenticated) {
      refreshLedgers()
    } else {
      // 登出时清空状态
      setLedgers([])
      setCurrentLedger(null)
    }
  }, [isAuthenticated, refreshLedgers])

  const createLedger = useCallback(async (name: string, icon?: string, color?: string): Promise<Ledger> => {
    const clientId = `ledger_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    
    const cloudLedger = await apiClient.createLedger({
      clientId,
      name,
      icon: icon || '📒',
      color: color || '#6366F1',
    })
    
    const newLedger = cloudToLocal(cloudLedger)
    setLedgers(prev => [...prev, newLedger])
    
    return newLedger
  }, [])

  const updateLedger = useCallback(async (id: string, data: Partial<Omit<Ledger, 'id' | 'createdAt'>>) => {
    const cloudLedger = await apiClient.updateLedger(id, data)
    const updatedLedger = cloudToLocal(cloudLedger)
    
    setLedgers(prev => prev.map(l => l.id === id ? updatedLedger : l))
    
    if (currentLedger?.id === id) {
      setCurrentLedger(updatedLedger)
    }
  }, [currentLedger])

  const deleteLedger = useCallback(async (id: string): Promise<boolean> => {
    if (ledgers.length <= 1) return false
    
    await apiClient.deleteLedger(id)
    
    const remaining = ledgers.filter(l => l.id !== id)
    setLedgers(remaining)
    
    if (currentLedger?.id === id && remaining.length > 0) {
      setCurrentLedger(remaining[0])
      localStorage.setItem(CURRENT_LEDGER_KEY, remaining[0].id)
    }
    
    return true
  }, [ledgers, currentLedger])

  const switchLedger = useCallback((ledgerId: string) => {
    const ledger = ledgers.find(l => l.id === ledgerId)
    if (ledger) {
      setCurrentLedger(ledger)
      localStorage.setItem(CURRENT_LEDGER_KEY, ledgerId)
    }
  }, [ledgers])

  return (
    <LedgerContext.Provider
      value={{
        ledgers,
        currentLedger,
        isLoading,
        error,
        createLedger,
        updateLedger,
        deleteLedger,
        switchLedger,
        refreshLedgers,
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
