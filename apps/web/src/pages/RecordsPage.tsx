import { useState, useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { ChevronLeft, ChevronRight, Trash2, Pencil, TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { formatCurrency, formatDate, dayjs } from '@/lib/utils'
import { getCategoryById, CHART_COLORS } from '@personal-accounting/shared/constants'
import type { Record } from '@personal-accounting/shared/types'

interface RecordsPageProps {
  onNavigate: (page: string) => void
  onEditRecord?: (record: Record) => void
}

export function RecordsPage({ onNavigate: _onNavigate, onEditRecord }: RecordsPageProps) {
  const { records, statistics, deleteRecord } = useRecords()
  const [currentMonth, setCurrentMonth] = useState(dayjs())
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [recordToDelete, setRecordToDelete] = useState<Record | null>(null)
  const [activeTab, setActiveTab] = useState('records')

  const monthStr = useMemo(() => {
    return currentMonth.format('YYYY年M月')
  }, [currentMonth])

  const monthRecords = useMemo(() => {
    const start = currentMonth.startOf('month').format('YYYY-MM-DD')
    const end = currentMonth.endOf('month').format('YYYY-MM-DD')
    return records.filter(record => {
      return record.date >= start && record.date <= end
    })
  }, [currentMonth, records])

  const monthStats = useMemo(() => {
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

  // 统计图表数据
  const pieData = useMemo(() => {
    return statistics.categoryBreakdown.map((item, index) => ({
      ...item,
      fill: CHART_COLORS[index % CHART_COLORS.length],
    }))
  }, [statistics.categoryBreakdown])

  const hasData = records.length > 0

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

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-slate-200/50">
          <p className="text-sm font-medium text-slate-900 mb-1">
            {payload[0].payload.month}
          </p>
          {payload.map((entry: any, index: number) => (
            <p
              key={index}
              className="text-sm"
              style={{ color: entry.color }}
            >
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-slate-200/50">
          <p className="text-sm font-medium text-slate-900">{data.category}</p>
          <p className="text-sm text-slate-600">{formatCurrency(data.amount)}</p>
          <p className="text-xs text-slate-500">{data.percentage.toFixed(1)}%</p>
        </div>
      )
    }
    return null
  }

  return (
    <>
      <Header title="账单" />
      <PageContainer>
        {/* Tab 切换 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="records">账单明细</TabsTrigger>
            <TabsTrigger value="statistics">统计分析</TabsTrigger>
          </TabsList>

          {/* 账单明细 Tab */}
          <TabsContent value="records" className="mt-0">
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
                            className="border-0 shadow-sm hover:shadow-md transition-all duration-300 group cursor-pointer"
                            onClick={() => onEditRecord?.(record)}
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
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      onEditRecord?.(record)
                                    }}
                                    className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-indigo-100 transition-all duration-200"
                                  >
                                    <Pencil className="w-4 h-4 text-indigo-500" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDeleteClick(record)
                                    }}
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
          </TabsContent>

          {/* 统计分析 Tab */}
          <TabsContent value="statistics" className="mt-0">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-teal-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm text-slate-600">总收入</span>
                  </div>
                  <p className="text-xl font-bold text-emerald-600">
                    {formatCurrency(statistics.totalIncome)}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm bg-gradient-to-br from-rose-50 to-pink-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-rose-500 flex items-center justify-center">
                      <TrendingDown className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm text-slate-600">总支出</span>
                  </div>
                  <p className="text-xl font-bold text-rose-600">
                    {formatCurrency(statistics.totalExpense)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {!hasData ? (
              <EmptyState title="暂无统计数据" description="开始记账后即可查看统计分析" />
            ) : (
              <Tabs defaultValue="trend" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="trend">收支趋势</TabsTrigger>
                  <TabsTrigger value="category">分类占比</TabsTrigger>
                </TabsList>

                <TabsContent value="trend" className="mt-0">
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <h3 className="text-sm font-medium text-slate-700 mb-4">
                        近6个月收支趋势
                      </h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={statistics.monthlyTrend}
                            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                          >
                            <defs>
                              <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                              </linearGradient>
                              <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                            <XAxis
                              dataKey="month"
                              tick={{ fontSize: 12, fill: '#64748B' }}
                              axisLine={{ stroke: '#E2E8F0' }}
                              tickLine={false}
                            />
                            <YAxis
                              tick={{ fontSize: 12, fill: '#64748B' }}
                              axisLine={false}
                              tickLine={false}
                              tickFormatter={(value) => `${value / 1000}k`}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                              type="monotone"
                              dataKey="income"
                              name="收入"
                              stroke="#10B981"
                              strokeWidth={2}
                              fill="url(#incomeGradient)"
                            />
                            <Area
                              type="monotone"
                              dataKey="expense"
                              name="支出"
                              stroke="#EF4444"
                              strokeWidth={2}
                              fill="url(#expenseGradient)"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex justify-center gap-6 mt-4">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-emerald-500" />
                          <span className="text-sm text-slate-600">收入</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-rose-500" />
                          <span className="text-sm text-slate-600">支出</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="category" className="mt-0">
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <h3 className="text-sm font-medium text-slate-700 mb-4">
                        支出分类占比
                      </h3>
                      {pieData.length === 0 ? (
                        <EmptyState
                          title="暂无支出数据"
                          description="记录支出后即可查看分类占比"
                        />
                      ) : (
                        <>
                          <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={pieData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={90}
                                  paddingAngle={2}
                                  dataKey="amount"
                                >
                                  {pieData.map((entry, idx) => (
                                    <Cell key={`cell-${idx}`} fill={entry.fill} />
                                  ))}
                                </Pie>
                                <Tooltip content={<PieTooltip />} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>

                          {/* Category List */}
                          <div className="mt-4 space-y-3">
                            {pieData.slice(0, 5).map((item) => (
                              <div
                                key={item.category}
                                className="flex items-center justify-between"
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                                    style={{ backgroundColor: `${item.fill}20` }}
                                  >
                                    <CategoryIcon
                                      icon={item.icon}
                                      size="sm"
                                      className="text-slate-700"
                                    />
                                  </div>
                                  <span className="text-sm font-medium text-slate-700">
                                    {item.category}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-semibold text-slate-900">
                                    {formatCurrency(item.amount)}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {item.percentage.toFixed(1)}%
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </TabsContent>
        </Tabs>

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
