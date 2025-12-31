import { Category } from '@/types'

export const EXPENSE_CATEGORIES: Category[] = [
  { id: 'food', name: '餐饮', icon: 'Utensils', type: 'expense' },
  { id: 'transport', name: '交通', icon: 'Car', type: 'expense' },
  { id: 'shopping', name: '购物', icon: 'ShoppingBag', type: 'expense' },
  { id: 'entertainment', name: '娱乐', icon: 'Gamepad2', type: 'expense' },
  { id: 'housing', name: '住房', icon: 'Home', type: 'expense' },
  { id: 'medical', name: '医疗', icon: 'Heart', type: 'expense' },
  { id: 'education', name: '教育', icon: 'GraduationCap', type: 'expense' },
  { id: 'communication', name: '通讯', icon: 'Smartphone', type: 'expense' },
  { id: 'utilities', name: '水电', icon: 'Zap', type: 'expense' },
  { id: 'other_expense', name: '其他', icon: 'MoreHorizontal', type: 'expense' },
]

export const INCOME_CATEGORIES: Category[] = [
  { id: 'salary', name: '工资', icon: 'Wallet', type: 'income' },
  { id: 'bonus', name: '奖金', icon: 'Gift', type: 'income' },
  { id: 'investment', name: '投资', icon: 'TrendingUp', type: 'income' },
  { id: 'parttime', name: '兼职', icon: 'Briefcase', type: 'income' },
  { id: 'refund', name: '退款', icon: 'RotateCcw', type: 'income' },
  { id: 'other_income', name: '其他', icon: 'MoreHorizontal', type: 'income' },
]

export const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]

export const getCategoryById = (id: string): Category | undefined => {
  return ALL_CATEGORIES.find(cat => cat.id === id)
}

export const getCategoriesByType = (type: 'income' | 'expense'): Category[] => {
  return type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
}

export const STORAGE_KEY = 'personal_accounting_records'

export const CHART_COLORS = [
  '#6366F1',
  '#8B5CF6',
  '#A78BFA',
  '#10B981',
  '#3B82F6',
  '#F59E0B',
  '#EF4444',
  '#EC4899',
  '#14B8A6',
  '#F97316',
]
