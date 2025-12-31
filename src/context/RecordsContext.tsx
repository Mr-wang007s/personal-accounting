import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Record, Statistics, DateRange } from '@/types'
import { storageService } from '@/services/storageService'

interface RecordsContextType {
  records: Record[]
  statistics: Statistics
  addRecord: (data: Omit<Record, 'id' | 'createdAt'>) => void
  updateRecord: (id: string, data: Partial<Record>) => void
  deleteRecord: (id: string) => void
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

  useEffect(() => {
    refreshData()
  }, [])

  const addRecord = (data: Omit<Record, 'id' | 'createdAt'>) => {
    storageService.addRecord(data)
    refreshData()
  }

  const updateRecord = (id: string, data: Partial<Record>) => {
    storageService.updateRecord(id, data)
    refreshData()
  }

  const deleteRecord = (id: string) => {
    storageService.deleteRecord(id)
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
