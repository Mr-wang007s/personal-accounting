import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface PageContainerProps {
  children: ReactNode
  className?: string
  hasHeader?: boolean
  hasBottomNav?: boolean
}

export function PageContainer({
  children,
  className,
  hasHeader = true,
  hasBottomNav = true,
}: PageContainerProps) {
  return (
    <main
      className={cn(
        'min-h-screen bg-gradient-to-b from-slate-50 to-white pb-20',
        hasHeader && 'pt-12',
        // 底部固定 BottomNav，高度约为 3.5rem，这里预留更多空间
        hasBottomNav && 'pb-20',
        className
      )}
    >
      <div className="max-w-lg mx-auto px-3 py-2">{children}</div>
    </main>
  )
}
