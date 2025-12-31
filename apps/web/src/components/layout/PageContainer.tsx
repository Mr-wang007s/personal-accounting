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
        'min-h-screen bg-gradient-to-b from-slate-50 to-white',
        hasHeader && 'pt-12',
        hasBottomNav && 'pb-18',
        className
      )}
    >
      <div className="max-w-lg mx-auto px-3 py-2">{children}</div>
    </main>
  )
}
