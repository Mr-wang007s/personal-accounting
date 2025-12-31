import { Home, PlusCircle, List, PieChart } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BottomNavProps {
  currentPage: string
  onNavigate: (page: string) => void
}

const navItems = [
  { id: 'home', label: '首页', icon: Home },
  { id: 'record', label: '记账', icon: PlusCircle },
  { id: 'records', label: '账单', icon: List },
  { id: 'statistics', label: '统计', icon: PieChart },
]

export function BottomNav({ currentPage, onNavigate }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-t border-slate-200/50 safe-area-inset-bottom">
      <div className="max-w-lg mx-auto flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = currentPage === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all duration-200',
                'hover:bg-slate-100/50 rounded-xl mx-1',
                isActive ? 'text-primary' : 'text-slate-500'
              )}
            >
              <div
                className={cn(
                  'p-1.5 rounded-xl transition-all duration-300',
                  isActive && 'bg-primary/10 scale-110'
                )}
              >
                <Icon
                  className={cn(
                    'w-5 h-5 transition-all duration-200',
                    isActive && 'stroke-[2.5px]'
                  )}
                />
              </div>
              <span
                className={cn(
                  'text-[10px] font-medium transition-all duration-200',
                  isActive && 'font-semibold'
                )}
              >
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
