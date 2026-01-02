/**
 * 分类模型 - 与其他端保持一致
 */
import { RecordType } from './Record'

export interface Category {
  id: string
  name: string
  icon: string
  type: RecordType
  color: string
}

// 支出分类 (10)
export const EXPENSE_CATEGORIES: Category[] = [
  { id: 'food', name: '餐饮', icon: 'food', type: 'expense', color: '#F59E0B' },
  { id: 'transport', name: '交通', icon: 'transport', type: 'expense', color: '#3B82F6' },
  { id: 'shopping', name: '购物', icon: 'shopping', type: 'expense', color: '#EC4899' },
  { id: 'entertainment', name: '娱乐', icon: 'entertainment', type: 'expense', color: '#8B5CF6' },
  { id: 'housing', name: '住房', icon: 'housing', type: 'expense', color: '#10B981' },
  { id: 'medical', name: '医疗', icon: 'medical', type: 'expense', color: '#EF4444' },
  { id: 'education', name: '教育', icon: 'education', type: 'expense', color: '#6366F1' },
  { id: 'communication', name: '通讯', icon: 'communication', type: 'expense', color: '#14B8A6' },
  { id: 'utilities', name: '水电', icon: 'utilities', type: 'expense', color: '#F97316' },
  { id: 'other_expense', name: '其他', icon: 'other', type: 'expense', color: '#94A3B8' },
]

// 收入分类 (6)
export const INCOME_CATEGORIES: Category[] = [
  { id: 'salary', name: '工资', icon: 'salary', type: 'income', color: '#10B981' },
  { id: 'bonus', name: '奖金', icon: 'bonus', type: 'income', color: '#F59E0B' },
  { id: 'investment', name: '投资', icon: 'investment', type: 'income', color: '#6366F1' },
  { id: 'parttime', name: '兼职', icon: 'parttime', type: 'income', color: '#3B82F6' },
  { id: 'refund', name: '退款', icon: 'refund', type: 'income', color: '#14B8A6' },
  { id: 'other_income', name: '其他', icon: 'other', type: 'income', color: '#94A3B8' },
]

// 所有分类
export const ALL_CATEGORIES: Category[] = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]

// 根据 ID 获取分类
export function getCategoryById(id: string): Category | undefined {
  return ALL_CATEGORIES.find(cat => cat.id === id)
}

// 根据类型获取分类列表
export function getCategoriesByType(type: RecordType): Category[] {
  return type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
}

// 分类图标映射 (使用 SymbolGlyph 或 Resource)
export const CATEGORY_ICONS: Record<string, Resource> = {
  'food': $r('sys.symbol.fork_knife'),
  'transport': $r('sys.symbol.car'),
  'shopping': $r('sys.symbol.bag'),
  'entertainment': $r('sys.symbol.gamecontroller'),
  'housing': $r('sys.symbol.house'),
  'medical': $r('sys.symbol.heart'),
  'education': $r('sys.symbol.book'),
  'communication': $r('sys.symbol.phone'),
  'utilities': $r('sys.symbol.bolt'),
  'other_expense': $r('sys.symbol.ellipsis'),
  'salary': $r('sys.symbol.wallet_pass'),
  'bonus': $r('sys.symbol.gift'),
  'investment': $r('sys.symbol.chart_line_uptrend_xyaxis'),
  'parttime': $r('sys.symbol.briefcase'),
  'refund': $r('sys.symbol.arrow_uturn_backward'),
  'other_income': $r('sys.symbol.ellipsis'),
}

// 图表颜色
export const CHART_COLORS: string[] = [
  '#6366F1', '#8B5CF6', '#A78BFA', '#10B981', '#3B82F6',
  '#F59E0B', '#EF4444', '#EC4899', '#14B8A6', '#F97316',
]
