import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { Record, Statistics, DateRange } from '@personal-accounting/shared/types'
import { storageService } from '@/services/storageService'
import { syncService } from '@/services/syncService'
import { useLedger } from '@/context/LedgerContext'

interface RecordsContextType {
  records: Record[]
  statistics: Statistics
  addRecord: (data: Omit<Record, 'id' | 'createdAt'>) => void
  updateRecord: (id: string, data: Partial<Record>) => void
  deleteRecord: (id: string) => void
  clearAllData: () => void
  refreshData: () => void
  getRecordsByDateRange: (dateRange: DateRange) => Record[]
  getStatistics: (dateRange?: DateRange) => Statistics
}

const RecordsContext = createContext<RecordsContextType | undefined>(undefined)

export function RecordsProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<Record[]>([])
  const [statistics, setStatistics] = useState<Statistics>({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    categoryBreakdown: [],
    monthlyTrend: [],
  })

  const refreshData = () => {
    const allRecords = storageService.getRecords()
    setRecords(allRecords)
    setStatistics(storageService.getStatistics())
  }

  const { currentLedger } = useLedger()

  useEffect(() => {
    refreshData()
  }, [currentLedger?.id])

  useEffect(() => {
    refreshData()
    
    // 监听 storage 变化（用于同步后刷新）
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'personal_accounting_records') {
        refreshData()
      }
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const addRecord = (data: Omit<Record, 'id' | 'createdAt'>) => {
    const newRecord = storageService.addRecord(data)
    // 追踪变更用于同步
    syncService.trackCreate(newRecord)
    refreshData()
  }

  const updateRecord = (id: string, data: Partial<Record>) => {
    storageService.updateRecord(id, data)
    // 追踪变更用于同步
    syncService.trackUpdate(id, data)
    refreshData()
  }

  const deleteRecord = (id: string) => {
    storageService.deleteRecord(id)
    // 追踪变更用于同步
    syncService.trackDelete(id)
    refreshData()
  }

  const clearAllData = () => {
    storageService.clearCurrentLedgerData()
    refreshData()
  }

  const getRecordsByDateRange = (dateRange: DateRange) => {
    return storageService.getRecordsByDateRange(dateRange)
  }

  const getStatistics = (dateRange?: DateRange) => {
    return storageService.getStatistics(dateRange)
  }

  return (
    <RecordsContext.Provider
      value={{
        records,
        statistics,
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
