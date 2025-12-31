import {
  Utensils,
  Car,
  ShoppingBag,
  Gamepad2,
  Home,
  Heart,
  GraduationCap,
  Smartphone,
  Zap,
  MoreHorizontal,
  Wallet,
  Gift,
  TrendingUp,
  Briefcase,
  RotateCcw,
  Circle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const iconMap: { [key: string]: React.ComponentType<{ className?: string }> } = {
  Utensils,
  Car,
  ShoppingBag,
  Gamepad2,
  Home,
  Heart,
  GraduationCap,
  Smartphone,
  Zap,
  MoreHorizontal,
  Wallet,
  Gift,
  TrendingUp,
  Briefcase,
  RotateCcw,
  Circle,
}

interface CategoryIconProps {
  icon: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
  type?: 'income' | 'expense'
}

export function CategoryIcon({ icon, className, size = 'md', type }: CategoryIconProps) {
  const Icon = iconMap[icon] || Circle

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }

  return (
    <Icon
      className={cn(
        sizeClasses[size],
        type === 'income' && 'text-emerald-500',
        type === 'expense' && 'text-rose-500',
        className
      )}
    />
  )
}
