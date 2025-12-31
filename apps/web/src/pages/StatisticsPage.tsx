import { useMemo } from 'react'
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
import { TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Header } from '@/components/layout/Header'
import { PageContainer } from '@/components/layout/PageContainer'
import { CategoryIcon } from '@/components/common/CategoryIcon'
import { EmptyState } from '@/components/common/EmptyState'
import { useRecords } from '@/context/RecordsContext'
import { formatCurrency } from '@/lib/utils'
import { CHART_COLORS } from '@personal-accounting/shared/constants'

interface StatisticsPageProps {
  onNavigate: (page: string) => void
}

export function StatisticsPage({ onNavigate: _onNavigate }: StatisticsPageProps) {
  const { statistics, records } = useRecords()

  const hasData = records.length > 0

  const pieData = useMemo(() => {
    return statistics.categoryBreakdown.map((item, index) => ({
      ...item,
      fill: CHART_COLORS[index % CHART_COLORS.length],
    }))
  }, [statistics.categoryBreakdown])

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
      <Header title="统计分析" />
      <PageContainer>
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
      </PageContainer>
    </>
  )
}
