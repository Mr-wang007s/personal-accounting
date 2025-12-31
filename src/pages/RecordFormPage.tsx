import { useState } from 'react'
import { Check, Calendar } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Header } from '@/components/layout/Header'
import { PageContainer } from '@/components/layout/PageContainer'
import { CategoryIcon } from '@/components/common/CategoryIcon'
import { useRecords } from '@/context/RecordsContext'
import { getCategoriesByType } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { RecordType } from '@/types'

interface RecordFormPageProps {
  type: RecordType
  onNavigate: (page: string) => void
}

export function RecordFormPage({ type, onNavigate }: RecordFormPageProps) {
  const { addRecord } = useRecords()
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const categories = getCategoriesByType(type)
  const isIncome = type === 'income'

  const handleSubmit = () => {
    if (!amount || !category) return

    setIsSubmitting(true)
    
    addRecord({
      type,
      amount: parseFloat(amount),
      category,
      date,
      note: note || undefined,
    })

    setTimeout(() => {
      setIsSubmitting(false)
      onNavigate('home')
    }, 300)
  }

  const handleAmountChange = (value: string) => {
    // Only allow numbers and one decimal point
    const regex = /^\d*\.?\d{0,2}$/
    if (regex.test(value) || value === '') {
      setAmount(value)
    }
  }

  return (
    <>
      <Header
        title={isIncome ? '记收入' : '记支出'}
        showBack
        onBack={() => onNavigate('home')}
      />
      <PageContainer hasBottomNav={false}>
        {/* Amount Input */}
        <Card
          className={cn(
            'border-0 shadow-lg overflow-hidden',
            isIncome
              ? 'bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-500/20'
              : 'bg-gradient-to-br from-rose-500 to-pink-500 shadow-rose-500/20'
          )}
        >
          <CardContent className="p-6">
            <p className="text-white/70 text-sm mb-2">金额</p>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-white">¥</span>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0.00"
                className="flex-1 text-4xl font-bold text-white bg-transparent border-none outline-none placeholder:text-white/40"
              />
            </div>
          </CardContent>
        </Card>

        {/* Category Selection */}
        <div className="mt-6">
          <h3 className="text-sm font-medium text-slate-700 mb-3">选择分类</h3>
          <div className="grid grid-cols-5 gap-3">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={cn(
                  'flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all duration-200',
                  category === cat.id
                    ? isIncome
                      ? 'bg-emerald-100 ring-2 ring-emerald-500'
                      : 'bg-rose-100 ring-2 ring-rose-500'
                    : 'bg-slate-50 hover:bg-slate-100'
                )}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200',
                    category === cat.id
                      ? isIncome
                        ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30'
                        : 'bg-rose-500 shadow-lg shadow-rose-500/30'
                      : 'bg-white shadow-sm'
                  )}
                >
                  <CategoryIcon
                    icon={cat.icon}
                    className={category === cat.id ? 'text-white' : 'text-slate-600'}
                  />
                </div>
                <span
                  className={cn(
                    'text-xs font-medium',
                    category === cat.id
                      ? isIncome
                        ? 'text-emerald-700'
                        : 'text-rose-700'
                      : 'text-slate-600'
                  )}
                >
                  {cat.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Date Selection */}
        <div className="mt-6">
          <h3 className="text-sm font-medium text-slate-700 mb-3">日期</h3>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="pl-10 h-12 bg-slate-50 border-0 focus-visible:ring-2 focus-visible:ring-indigo-500"
            />
          </div>
        </div>

        {/* Note Input */}
        <div className="mt-6">
          <h3 className="text-sm font-medium text-slate-700 mb-3">备注（可选）</h3>
          <Input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="添加备注..."
            className="h-12 bg-slate-50 border-0 focus-visible:ring-2 focus-visible:ring-indigo-500"
          />
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={!amount || !category || isSubmitting}
          className={cn(
            'w-full h-14 mt-8 text-base font-semibold shadow-lg transition-all duration-300',
            isIncome
              ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30'
              : 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/30',
            'disabled:opacity-50 disabled:shadow-none'
          )}
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              保存中...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5" />
              保存记录
            </div>
          )}
        </Button>
      </PageContainer>
    </>
  )
}
