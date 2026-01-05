import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import type { Record, Statistics, DateRange } from '@personal-accounting/shared/types'
import { recordService } from '@/services/recordService'
import { useLedger } from '@/context/LedgerContext'

interface RecordsContextType {
  records: Record[]
  statistics: Statistics
  isLoading: boolean
  error: string | null
  addRecord: (data: Omit<Record, 'id' | 'createdAt'>) => Promise<void>
  updateRecord: (id: string, data: Partial<Record>) => Promise<void>
  deleteRecord: (id: string) => Promise<void>
  clearAllData: () => Promise<void>
  refreshData: () => Promise<void>
  getRecordsByDateRange: (dateRange: DateRange) => Promise<Record[]>
  getStatistics: (dateRange?: DateRange) => Promise<Statistics>
}

const defaultStatistics: Statistics = {
  totalIncome: 0,
  totalExpense: 0,
  balance: 0,
  categoryBreakdown: [],
  monthlyTrend: [],
}

const RecordsContext = createContext<RecordsContextType | undefined>(undefined)

export function RecordsProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<Record[]>([])
  const [statistics, setStatistics] = useState<Statistics>(defaultStatistics)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { currentLedger } = useLedger()

  const refreshData = useCallback(async () => {
    if (!currentLedger?.id) return

    setIsLoading(true)
    setError(null)
    
    try {
      await recordService.refreshCache()
      const allRecords = await recordService.getRecords(currentLedger.id)
      setRecords(allRecords)
      const stats = await recordService.getStatistics(currentLedger.id)
      setStatistics(stats)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败')
      console.error('[RecordsContext] 刷新数据失败:', err)
    } finally {
      setIsLoading(false)
    }
  }, [currentLedger?.id])

  useEffect(() => {
    if (currentLedger?.id) {
      refreshData()
    }
  }, [currentLedger?.id, refreshData])

  const addRecord = useCallback(async (data: Omit<Record, 'id' | 'createdAt'>) => {
    if (!currentLedger?.id) return

    try {
      await recordService.addRecord({
        ...data,
        ledgerId: data.ledgerId || currentLedger.id,
      })
      await refreshData()
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加记录失败')
      throw err
    }
  }, [currentLedger?.id, refreshData])

  const updateRecord = useCallback(async (id: string, data: Partial<Record>) => {
    try {
      await recordService.updateRecord(id, data)
      await refreshData()
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新记录失败')
      throw err
    }
  }, [refreshData])

  const deleteRecord = useCallback(async (id: string) => {
    try {
      await recordService.deleteRecord(id)
      await refreshData()
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除记录失败')
      throw err
    }
  }, [refreshData])

  const clearAllData = useCallback(async () => {
    if (!currentLedger?.id) return

    try {
      await recordService.deleteRecordsByLedger(currentLedger.id)
      await refreshData()
    } catch (err) {
      setError(err instanceof Error ? err.message : '清除数据失败')
      throw err
    }
  }, [currentLedger?.id, refreshData])

  const getRecordsByDateRange = useCallback(async (dateRange: DateRange) => {
    if (!currentLedger?.id) return []
    return recordService.getRecordsByDateRange(currentLedger.id, dateRange)
  }, [currentLedger?.id])

  const getStatistics = useCallback(async (dateRange?: DateRange) => {
    if (!currentLedger?.id) return defaultStatistics
    return recordService.getStatistics(currentLedger.id, dateRange)
  }, [currentLedger?.id])

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
        clearAllData,
        refreshData,
        getRecordsByDateRange,
        getStatistics,
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
