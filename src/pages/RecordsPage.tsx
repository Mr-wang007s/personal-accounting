import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Header } from '@/components/layout/Header'
import { PageContainer } from '@/components/layout/PageContainer'
import { CategoryIcon } from '@/components/common/CategoryIcon'
import { EmptyState } from '@/components/common/EmptyState'
import { useRecords } from '@/context/RecordsContext'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getCategoryById } from '@/lib/constants'
import { Record } from '@/types'
import dayjs from '@/lib/dayjs'

interface RecordsPageProps {
  onNavigate: (page: string) => void
}

export function RecordsPage({ onNavigate }: RecordsPageProps) {
  const { records, deleteRecord } = useRecords()
  const [currentMonth, setCurrentMonth] = useState(dayjs())
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [recordToDelete, setRecordToDelete] = useState<Record | null>(null)

  const monthStr = useMemo(() => {
    return currentMonth.format('YYYY年M月')
  }, [currentMonth])

  const monthRecords = useMemo(() => {
    const start = currentMonth.startOf('month').format('YYYY-MM-DD')
    const end = currentMonth.endOf('month').format('YYYY-MM-DD')
    // 直接用字符串比较，避免时区问题
    return records.filter(record => {
      return record.date >= start && record.date <= end
    })
  }, [currentMonth, records])

  const monthStats = useMemo(() => {
    // 基于 monthRecords 计算统计
    const totalIncome = monthRecords
      .filter(r => r.type === 'income')
      .reduce((sum, r) => sum + r.amount, 0)
    const totalExpense = monthRecords
      .filter(r => r.type === 'expense')
      .reduce((sum, r) => sum + r.amount, 0)
    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense
    }
  }, [monthRecords])

  // Group records by date
  const groupedRecords = useMemo(() => {
    const groups: { [key: string]: Record[] } = {}
    monthRecords.forEach((record) => {
      if (!groups[record.date]) {
        groups[record.date] = []
      }
      groups[record.date].push(record)
    })
    return Object.entries(groups).sort(
      ([a], [b]) => dayjs(b).valueOf() - dayjs(a).valueOf()
    )
  }, [monthRecords])

  const handlePrevMonth = () => {
    setCurrentMonth(currentMonth.subtract(1, 'month'))
  }

  const handleNextMonth = () => {
    const next = currentMonth.add(1, 'month')
    if (next.isBefore(dayjs()) || next.isSame(dayjs(), 'month')) {
      setCurrentMonth(next)
    }
  }

  const isCurrentMonth = currentMonth.isSame(dayjs(), 'month')

  const handleDeleteClick = (record: Record) => {
    setRecordToDelete(record)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = () => {
    if (recordToDelete) {
      deleteRecord(recordToDelete.id)
      setDeleteDialogOpen(false)
      setRecordToDelete(null)
    }
  }

  return (
    <>
      <Header title="账单明细" />
      <PageContainer>
        {/* Month Selector */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <span className="text-lg font-semibold text-slate-900">{monthStr}</span>
          <button
            onClick={handleNextMonth}
            className="p-2 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-30"
            disabled={isCurrentMonth}
          >
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Month Summary */}
        <Card className="border-0 shadow-sm bg-gradient-to-r from-slate-50 to-white mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-slate-500 mb-1">收入</p>
                <p className="text-lg font-semibold text-emerald-600">
                  {formatCurrency(monthStats.totalIncome)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">支出</p>
                <p className="text-lg font-semibold text-rose-600">
                  {formatCurrency(monthStats.totalExpense)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">结余</p>
                <p
                  className={`text-lg font-semibold ${
                    monthStats.balance >= 0 ? 'text-indigo-600' : 'text-rose-600'
                  }`}
                >
                  {formatCurrency(monthStats.balance)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Records List */}
        {groupedRecords.length === 0 ? (
          <EmptyState title="本月暂无记录" description="点击下方记账按钮开始记录" />
        ) : (
          <div className="space-y-6">
            {groupedRecords.map(([date, dayRecords]) => (
              <div key={date}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-slate-700">
                    {formatDate(date)}
                  </span>
                  <span className="text-xs text-slate-500">
                    {dayRecords.length} 笔
                  </span>
                </div>
                <div className="space-y-2">
                  {dayRecords.map((record) => {
                    const category = getCategoryById(record.category)
                    return (
                      <Card
                        key={record.id}
                        className="border-0 shadow-sm hover:shadow-md transition-all duration-300 group"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                  record.type === 'income'
                                    ? 'bg-emerald-100'
                                    : 'bg-rose-100'
                                }`}
                              >
                                <CategoryIcon
                                  icon={category?.icon || 'Circle'}
                                  type={record.type}
                                />
                              </div>
                              <div>
                                <p className="font-medium text-slate-900">
                                  {category?.name || record.category}
                                </p>
                                {record.note && (
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    {record.note}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <p
                                className={`font-semibold ${
                                  record.type === 'income'
                                    ? 'text-emerald-600'
                                    : 'text-rose-600'
                                }`}
                              >
                                {record.type === 'income' ? '+' : '-'}
                                {formatCurrency(record.amount)}
                              </p>
                              <button
                                onClick={() => handleDeleteClick(record)}
                                className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-rose-100 transition-all duration-200"
                              >
                                <Trash2 className="w-4 h-4 text-rose-500" />
                              </button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>确认删除</DialogTitle>
              <DialogDescription>
                确定要删除这条记录吗？此操作无法撤销。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                取消
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                className="bg-rose-500 hover:bg-rose-600"
              >
                删除
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageContainer>
    </>
  )
}
