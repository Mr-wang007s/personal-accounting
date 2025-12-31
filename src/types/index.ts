export type RecordType = 'income' | 'expense'

export interface Record {
  id: string
  type: RecordType
  amount: number
  category: string
  date: string
  note?: string
  createdAt: string
}

export interface Category {
  id: string
  name: string
  icon: string
  type: RecordType
}

export interface CategoryStat {
  category: string
  amount: number
  percentage: number
  icon: string
}

export interface MonthlyData {
  month: string
  income: number
  expense: number
}

export interface Statistics {
  totalIncome: number
  totalExpense: number
  balance: number
  categoryBreakdown: CategoryStat[]
  monthlyTrend: MonthlyData[]
}

export interface DateRange {
  start: string
  end: string
}
