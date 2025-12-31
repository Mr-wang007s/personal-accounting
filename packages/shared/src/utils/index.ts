// 工具函数
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'

// 配置 dayjs 中文
dayjs.locale('zh-cn')

/**
 * 生成唯一 ID
 */
export function generateId(): string {
  return dayjs().valueOf().toString(36) + Math.random().toString(36).substring(2)
}

/**
 * 获取当前时间的 ISO 字符串
 */
export function getNowISO(): string {
  return dayjs().toISOString()
}

/**
 * 获取今天的日期字符串 (YYYY-MM-DD)
 */
export function getToday(): string {
  return dayjs().format('YYYY-MM-DD')
}

/**
 * 格式化货币（带货币符号）
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
  }).format(amount)
}

/**
 * 格式化数字（不带货币符号）
 */
export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * 格式化日期（YYYY年M月D日）
 */
export function formatDate(date: string): string {
  return dayjs(date).format('YYYY年M月D日')
}

/**
 * 格式化短日期（M月D日）
 */
export function formatShortDate(date: string): string {
  return dayjs(date).format('M月D日')
}

/**
 * 格式化相对时间
 */
export function formatRelativeDate(date: string): string {
  const d = dayjs(date)
  const today = dayjs()

  if (d.isSame(today, 'day')) {
    return '今天'
  } else if (d.isSame(today.subtract(1, 'day'), 'day')) {
    return '昨天'
  } else if (d.isSame(today, 'year')) {
    return d.format('M月D日')
  } else {
    return d.format('YYYY年M月D日')
  }
}

/**
 * 获取月份的起止日期
 */
export function getMonthRange(date: dayjs.Dayjs = dayjs()): { start: string; end: string } {
  return {
    start: date.startOf('month').format('YYYY-MM-DD'),
    end: date.endOf('month').format('YYYY-MM-DD'),
  }
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
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && dayjs(date).isValid()
}

// 导出 dayjs 实例供其他包使用
export { dayjs }
