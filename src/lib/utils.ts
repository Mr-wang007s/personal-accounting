import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import dayjs from './dayjs'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: string): string {
  return dayjs(date).format('YYYY年M月D日')
}

export function formatShortDate(date: string): string {
  return dayjs(date).format('M月D日')
}

export function generateId(): string {
  return dayjs().valueOf().toString(36) + Math.random().toString(36).substring(2)
}

export function getMonthRange(date: dayjs.Dayjs = dayjs()): { start: string; end: string } {
  const start = date.startOf('month').format('YYYY-MM-DD')
  const end = date.endOf('month').format('YYYY-MM-DD')
  return { start, end }
}

// 获取今天的日期字符串 YYYY-MM-DD
export function getToday(): string {
  return dayjs().format('YYYY-MM-DD')
}

// 获取当前时间的 ISO 字符串
export function getNowISO(): string {
  return dayjs().toISOString()
}
