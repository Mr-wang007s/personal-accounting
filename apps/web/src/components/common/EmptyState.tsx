import { FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  title?: string
  description?: string
  className?: string
}

export function EmptyState({
  title = '暂无数据',
  description = '快去记录你的第一笔账单吧',
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12', className)}>
      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
        <FileText className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-slate-700 font-medium mb-1">{title}</h3>
      <p className="text-slate-500 text-sm">{description}</p>
    </div>
  )
}
