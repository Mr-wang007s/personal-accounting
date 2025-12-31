/**
 * 常量定义 - 与 @personal-accounting/shared 保持一致
 * 小程序环境下的常量定义副本
 */
import type { Category, RecordType } from './types'

// 存储键
export const STORAGE_KEY = 'personal_accounting_records'
export const LEDGERS_KEY = 'pa_ledgers'
export const USER_PROFILE_KEY = 'pa_user_profile'

// 支出分类
export const EXPENSE_CATEGORIES: Category[] = [
  { id: 'food', name: '餐饮', icon: 'food', type: 'expense' },
  { id: 'transport', name: '交通', icon: 'transport', type: 'expense' },
  { id: 'shopping', name: '购物', icon: 'shopping', type: 'expense' },
  { id: 'entertainment', name: '娱乐', icon: 'entertainment', type: 'expense' },
  { id: 'housing', name: '住房', icon: 'housing', type: 'expense' },
  { id: 'medical', name: '医疗', icon: 'medical', type: 'expense' },
  { id: 'education', name: '教育', icon: 'education', type: 'expense' },
  { id: 'communication', name: '通讯', icon: 'communication', type: 'expense' },
  { id: 'utilities', name: '水电', icon: 'utilities', type: 'expense' },
  { id: 'other_expense', name: '其他', icon: 'other', type: 'expense' },
]

// 收入分类
export const INCOME_CATEGORIES: Category[] = [
  { id: 'salary', name: '工资', icon: 'salary', type: 'income' },
  { id: 'bonus', name: '奖金', icon: 'bonus', type: 'income' },
  { id: 'investment', name: '投资', icon: 'investment', type: 'income' },
  { id: 'parttime', name: '兼职', icon: 'parttime', type: 'income' },
  { id: 'refund', name: '退款', icon: 'refund', type: 'income' },
  { id: 'other_income', name: '其他', icon: 'other', type: 'income' },
]

// 所有分类
export const ALL_CATEGORIES: Category[] = [
  ...EXPENSE_CATEGORIES,
  ...INCOME_CATEGORIES,
]

// 根据 ID 获取分类
export function getCategoryById(id: string): Category | undefined {
  return ALL_CATEGORIES.find((cat) => cat.id === id)
}

// 根据类型获取分类列表
export function getCategoriesByType(type: RecordType): Category[] {
  return type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
}

// 图表颜色
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

// 分类图标颜色映射
export const CATEGORY_COLORS: Record<string, string> = {
  food: '#F59E0B',
  transport: '#3B82F6',
  shopping: '#EC4899',
  entertainment: '#8B5CF6',
  housing: '#10B981',
  medical: '#EF4444',
  education: '#6366F1',
  communication: '#14B8A6',
  utilities: '#F97316',
  other_expense: '#94A3B8',
  salary: '#10B981',
  bonus: '#F59E0B',
  investment: '#6366F1',
  parttime: '#3B82F6',
  refund: '#14B8A6',
  other_income: '#94A3B8',
}
