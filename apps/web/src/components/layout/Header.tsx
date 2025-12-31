import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HeaderProps {
  title: string
  showBack?: boolean
  onBack?: () => void
  rightContent?: React.ReactNode
  className?: string
}

export function Header({ title, showBack, onBack, rightContent, className }: HeaderProps) {
  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/50',
        className
      )}
    >
      <div className="max-w-lg mx-auto h-14 flex items-center justify-between px-4">
        <div className="w-10">
          {showBack && (
            <button
              onClick={onBack}
              className="p-2 -ml-2 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-700" />
            </button>
          )}
        </div>
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        <div className="w-10 flex justify-end">{rightContent}</div>
      </div>
    </header>
  )
}
