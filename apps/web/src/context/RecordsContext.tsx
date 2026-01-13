/**
 * 记录上下文 - 管理记录状态和统计
 * 依赖 LedgerContext 的当前账本
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import type { Record, Statistics, DateRange, CategoryStat, MonthlyData } from '@personal-accounting/shared/types'
import { getCategoryById } from '@personal-accounting/shared/constants'
import { dayjs } from '@personal-accounting/shared/utils'
import { apiClient, CloudRecord } from '@/services/apiClient'
import { useLedger } from './LedgerContext'

interface RecordsContextType {
  records: Record[]
  statistics: Statistics
  isLoading: boolean
  error: string | null
  addRecord: (data: Omit<Record, 'id' | 'createdAt'>) => Promise<void>
  updateRecord: (id: string, data: Partial<Record>) => Promise<void>
  deleteRecord: (id: string) => Promise<void>
  refreshData: () => Promise<void>
}

const defaultStatistics: Statistics = {
  totalIncome: 0,
  totalExpense: 0,
  balance: 0,
  categoryBreakdown: [],
  monthlyTrend: [],
}

const RecordsContext = createContext<RecordsContextType | undefined>(undefined)

// 将云端记录转换为本地记录格式
function cloudToLocal(cloud: CloudRecord): Record {
  return {
    id: cloud.id,
    type: cloud.type,
    amount: cloud.amount,
    category: cloud.category,
    date: cloud.date,
    note: cloud.note,
    createdAt: cloud.createdAt,
    updatedAt: cloud.updatedAt,
    ledgerId: cloud.ledgerId,
    syncStatus: 'synced',
  }
}

// 计算统计数据
function calculateStatistics(records: Record[]): Statistics {
  const totalIncome = records
    .filter(r => r.type === 'income')
    .reduce((sum, r) => sum + r.amount, 0)

  const totalExpense = records
    .filter(r => r.type === 'expense')
    .reduce((sum, r) => sum + r.amount, 0)

  const balance = totalIncome - totalExpense

  // Category breakdown for expenses
  const categoryMap = new Map<string, number>()
  records
    .filter(r => r.type === 'expense')
    .forEach(r => {
      const current = categoryMap.get(r.category) || 0
      categoryMap.set(r.category, current + r.amount)
    })

  const categoryBreakdown: CategoryStat[] = Array.from(categoryMap.entries())
    .map(([category, amount]) => {
      const cat = getCategoryById(category)
      return {
        category: cat?.name || category,
        amount,
        percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
        icon: cat?.icon || 'Circle',
      }
    })
    .sort((a, b) => b.amount - a.amount)

  // Monthly trend (last 6 months)
  const monthlyTrend: MonthlyData[] = []
  const now = dayjs()
  for (let i = 5; i >= 0; i--) {
    const date = now.subtract(i, 'month')
    const monthStr = date.format('YYYY-MM')
    const monthRecords = records.filter(r => r.date.startsWith(monthStr))
    
    monthlyTrend.push({
      month: `${date.month() + 1}月`,
      income: monthRecords
        .filter(r => r.type === 'income')
        .reduce((sum, r) => sum + r.amount, 0),
      expense: monthRecords
        .filter(r => r.type === 'expense')
        .reduce((sum, r) => sum + r.amount, 0),
    })
  }

  return {
    totalIncome,
    totalExpense,
    balance,
    categoryBreakdown,
    monthlyTrend,
  }
}

export function RecordsProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<Record[]>([])
  const [statistics, setStatistics] = useState<Statistics>(defaultStatistics)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { currentLedger } = useLedger()

  const refreshData = useCallback(async () => {
    if (!currentLedger?.id || !apiClient.isAuthenticated()) return

    setIsLoading(true)
    setError(null)
    
    try {
      const cloudRecords = await apiClient.getRecords()
      const localRecords = cloudRecords
        .map(cloudToLocal)
        .filter(r => r.ledgerId === currentLedger.id)
        .sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf())
      
      setRecords(localRecords)
      setStatistics(calculateStatistics(localRecords))
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败')
    } finally {
      setIsLoading(false)
    }
  }, [currentLedger?.id])

  // 当前账本变化时刷新数据
  useEffect(() => {
    if (currentLedger?.id) {
      refreshData()
    }
  }, [currentLedger?.id, refreshData])

  const addRecord = useCallback(async (data: Omit<Record, 'id' | 'createdAt'>) => {
    if (!currentLedger?.id) return

    const clientId = `record_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    
    const cloudRecord = await apiClient.createRecord({
      clientId,
      type: data.type,
      amount: data.amount,
      category: data.category,
      date: data.date,
      note: data.note,
      ledgerId: data.ledgerId || currentLedger.id,
    })
    
    const newRecord = cloudToLocal(cloudRecord)
    const updatedRecords = [newRecord, ...records]
    setRecords(updatedRecords)
    setStatistics(calculateStatistics(updatedRecords))
  }, [currentLedger?.id, records])

  const updateRecord = useCallback(async (id: string, data: Partial<Record>) => {
    await apiClient.updateRecord(id, data)
    
    const updatedRecords = records.map(r => 
      r.id === id ? { ...r, ...data, updatedAt: new Date().toISOString() } : r
    )
    setRecords(updatedRecords)
    setStatistics(calculateStatistics(updatedRecords))
  }, [records])

  const deleteRecord = useCallback(async (id: string) => {
    await apiClient.deleteRecord(id)
    
    const updatedRecords = records.filter(r => r.id !== id)
    setRecords(updatedRecords)
    setStatistics(calculateStatistics(updatedRecords))
  }, [records])

  return (
    <RecordsContext.Provider
      value={{
        records,
        statistics,
        isLoading,
        error,
        addRecord,
        updateRecord,
        deleteRecord,
        refreshData,
      }}
    >
      {children}
    </RecordsContext.Provider>
  )
}

export function useRecords() {
  const context = useContext(RecordsContext)
  if (context === undefined) {
    throw new Error('useRecords must be used within a RecordsProvider')
  }
  return context
}
