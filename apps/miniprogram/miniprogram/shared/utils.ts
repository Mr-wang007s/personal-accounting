/**
 * 工具函数 - 与 @personal-accounting/shared 保持一致
 * 小程序环境下的工具函数副本
 */

/**
 * 生成唯一 ID
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2)
}

/**
 * 获取当前时间的 ISO 字符串
 */
export function getNowISO(): string {
  return new Date().toISOString()
}

/**
 * 获取今天的日期字符串 (YYYY-MM-DD)
 */
export function getToday(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 格式化货币（带货币符号）
 */
export function formatCurrency(amount: number): string {
  return `¥${amount.toFixed(2)}`
}

/**
 * 格式化数字（不带货币符号）
 */
export function formatNumber(amount: number): string {
  return amount.toFixed(2)
}

/**
 * 格式化金额（简写）
 */
export function formatAmount(amount: number): string {
  return amount.toFixed(2)
}

/**
 * 格式化日期（YYYY年M月D日）
 */
export function formatDateChinese(dateStr: string): string {
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${year}年${month}月${day}日`
}

/**
 * 格式化短日期（M月D日）
 */
export function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr)
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month}月${day}日`
}

/**
 * 格式化相对时间
 */
export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const dateOnly = formatDate(date)
  const todayOnly = formatDate(today)
  const yesterdayOnly = formatDate(yesterday)

  if (dateOnly === todayOnly) {
    return '今天'
  } else if (dateOnly === yesterdayOnly) {
    return '昨天'
  } else if (date.getFullYear() === today.getFullYear()) {
    return formatShortDate(dateStr)
  } else {
    return formatDateChinese(dateStr)
  }
}

/**
 * 获取日期标签（带星期）
 */
export function getDateLabel(dateStr: string): string {
  const today = getToday()
  const yesterday = formatDate(new Date(Date.now() - 86400000))

  if (dateStr === today) return '今天'
  if (dateStr === yesterday) return '昨天'

  const date = new Date(dateStr)
  const month = date.getMonth() + 1
  const day = date.getDate()
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const weekDay = weekDays[date.getDay()]

  return `${month}月${day}日 ${weekDay}`
}

/**
 * 获取月份的起止日期
 */
export function getMonthRange(date: Date = new Date()): { start: string; end: string } {
  const year = date.getFullYear()
  const month = date.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  return {
    start: formatDate(firstDay),
    end: formatDate(lastDay),
  }
}

/**
 * 获取当前月份 (1-12)
 */
export function getCurrentMonth(): number {
  return new Date().getMonth() + 1
}

/**
 * 获取当前年份
 */
export function getCurrentYear(): number {
  return new Date().getFullYear()
}

/**
 * 获取指定月份的天数
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

/**
 * 生成月份选项
 */
export function generateMonthOptions(count: number = 12): Array<{ label: string; year: number; month: number }> {
  const options: Array<{ label: string; year: number; month: number }> = []
  const now = new Date()

  for (let i = 0; i < count; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    options.push({
      label: `${year}年${month}月`,
      year,
      month,
    })
  }

  return options
}

/**
 * 验证金额
 */
export function validateAmount(amount: number): boolean {
  return typeof amount === 'number' && amount > 0 && isFinite(amount)
}

/**
 * 验证日期格式 (YYYY-MM-DD)
 */
export function validateDateFormat(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(new Date(date).getTime())
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: number | null = null
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(() => {
      func(...args)
    }, wait) as unknown as number
  }
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}
