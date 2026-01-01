import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { Record, Statistics, DateRange } from '@personal-accounting/shared/types'
import { storageService } from '@/services/storageService'
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
    storageService.addRecord(data)
    // 新记录默认 syncStatus = 'local'，会在下次同步时自动上传
    refreshData()
  }

  const updateRecord = (id: string, data: Partial<Record>) => {
    storageService.updateRecord(id, data)
    // 更新后记录会被标记为需要同步
    refreshData()
  }

  const deleteRecord = (id: string) => {
    storageService.deleteRecord(id)
    // 删除本地记录，同步时会处理云端删除
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
