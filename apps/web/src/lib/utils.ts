import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// cn 函数保留在 Web 端，因为依赖 clsx 和 tailwind-merge
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 从 shared 包重新导出工具函数，方便本地使用
export {
  generateId,
  getNowISO,
  getToday,
  formatCurrency,
  formatNumber,
  formatDate,
  formatShortDate,
  formatRelativeDate,
  getMonthRange,
  dayjs,
} from '@personal-accounting/shared/utils'
