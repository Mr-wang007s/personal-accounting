/**
 * 应用常量
 */

// 颜色
export class AppColors {
  static readonly PRIMARY = '#6366F1'
  static readonly PRIMARY_LIGHT = '#818CF8'
  static readonly SUCCESS = '#10B981'
  static readonly DANGER = '#EF4444'
  static readonly WARNING = '#F59E0B'
  static readonly BACKGROUND = '#F8FAFC'
  static readonly CARD_BACKGROUND = '#FFFFFF'
  static readonly TEXT_PRIMARY = '#1E293B'
  static readonly TEXT_SECONDARY = '#64748B'
  static readonly BORDER = '#E2E8F0'
}

// 尺寸
export class AppSizes {
  static readonly PADDING_XS = 4
  static readonly PADDING_SM = 8
  static readonly PADDING_MD = 16
  static readonly PADDING_LG = 24
  static readonly PADDING_XL = 32

  static readonly RADIUS_SM = 8
  static readonly RADIUS_MD = 12
  static readonly RADIUS_LG = 16
  static readonly RADIUS_FULL = 999

  static readonly FONT_XS = 12
  static readonly FONT_SM = 14
  static readonly FONT_MD = 16
  static readonly FONT_LG = 18
  static readonly FONT_XL = 20
  static readonly FONT_2XL = 24
  static readonly FONT_3XL = 30
}

// 格式化金额
export function formatCurrency(amount: number): string {
  return `¥${amount.toFixed(2)}`
}

// 格式化日期
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const month = date.getMonth() + 1
  const day = date.getDate()
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const weekDay = weekDays[date.getDay()]
  return `${month}月${day}日 ${weekDay}`
}

// 获取今天日期
export function getTodayDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  const day = now.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}
