import { TrendingUp, TrendingDown, Plus, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/layout/Header'
import { PageContainer } from '@/components/layout/PageContainer'
import { CategoryIcon } from '@/components/common/CategoryIcon'
import { EmptyState } from '@/components/common/EmptyState'
import { useRecords } from '@/context/RecordsContext'
import { formatCurrency, formatShortDate } from '@/lib/utils'
import { getCategoryById } from '@/lib/constants'

interface HomePageProps {
  onNavigate: (page: string) => void
}

export function HomePage({ onNavigate }: HomePageProps) {
  const { statistics, records } = useRecords()
  const recentRecords = records.slice(0, 5)

  return (
    <>
      <Header title="我的账本" />
      <PageContainer>
        {/* Balance Card */}
        <Card className="bg-gradient-to-br from-indigo-500 via-purple-500 to-violet-500 border-0 shadow-xl shadow-indigo-500/20 overflow-hidden relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVHJhbnNmb3JtPSJyb3RhdGUoNDUpIj48cGF0aCBkPSJNLTEwIDMwaDYwdjJoLTYweiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3QgZmlsbD0idXJsKCNhKSIgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIvPjwvc3ZnPg==')] opacity-50" />
          <CardContent className="p-6 relative">
            <p className="text-white/70 text-sm mb-1">当前余额</p>
            <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
              {formatCurrency(statistics.balance)}
            </h2>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-emerald-300" />
                </div>
                <div>
                  <p className="text-white/60 text-xs">收入</p>
                  <p className="text-white font-semibold text-sm">
                    {formatCurrency(statistics.totalIncome)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <TrendingDown className="w-4 h-4 text-rose-300" />
                </div>
                <div>
                  <p className="text-white/60 text-xs">支出</p>
                  <p className="text-white font-semibold text-sm">
                    {formatCurrency(statistics.totalExpense)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 mt-6">
          <Button
            onClick={() => onNavigate('income')}
            className="h-16 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-0 shadow-sm hover:shadow-md transition-all duration-300"
            variant="outline"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Plus className="w-5 h-5 text-white" />
              </div>
              <span className="font-medium">记收入</span>
            </div>
          </Button>
          <Button
            onClick={() => onNavigate('expense')}
            className="h-16 bg-rose-50 hover:bg-rose-100 text-rose-700 border-0 shadow-sm hover:shadow-md transition-all duration-300"
            variant="outline"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/30">
                <Plus className="w-5 h-5 text-white" />
              </div>
              <span className="font-medium">记支出</span>
            </div>
          </Button>
        </div>

        {/* Recent Records */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">最近记录</h3>
            <button
              onClick={() => onNavigate('records')}
              className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
            >
              查看全部
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {recentRecords.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-3">
              {recentRecords.map((record) => {
                const category = getCategoryById(record.category)
                return (
                  <Card
                    key={record.id}
                    className="border-0 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
                    onClick={() => onNavigate('records')}
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
                            <p className="text-xs text-slate-500">
                              {formatShortDate(record.date)}
                              {record.note && ` · ${record.note}`}
                            </p>
                          </div>
                        </div>
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
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </PageContainer>
    </>
  )
}
