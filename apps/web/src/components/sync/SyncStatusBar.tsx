import { useSync } from '@/context/SyncContext'
import { cn } from '@/lib/utils'

export function SyncStatusBar() {
  const { 
    syncState, 
    isConnected, 
    isAuthenticated, 
    pendingBackupCount,
    lastSyncAt,
    sync 
  } = useSync()

  const getStatusInfo = () => {
    if (!isConnected) {
      return {
        icon: '○',
        text: '离线',
        color: 'text-gray-400',
        bgColor: 'bg-gray-100',
      }
    }

    if (!isAuthenticated) {
      return {
        icon: '⚠',
        text: '未登录',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
      }
    }

    switch (syncState) {
      case 'syncing':
        return {
          icon: '↻',
          text: '同步中...',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
        }
      case 'success':
        return {
          icon: '✓',
          text: '已同步',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
        }
      case 'error':
        return {
          icon: '✕',
          text: '同步失败',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
        }
      case 'offline':
        return {
          icon: '○',
          text: '服务器离线',
          color: 'text-gray-400',
          bgColor: 'bg-gray-100',
        }
      default:
        if (pendingBackupCount > 0) {
          return {
            icon: '●',
            text: `${pendingBackupCount} 条待备份`,
            color: 'text-orange-600',
            bgColor: 'bg-orange-50',
          }
        }
        return {
          icon: '●',
          text: '已同步',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
        }
    }
  }

  const status = getStatusInfo()
  const canSync = isConnected && isAuthenticated && syncState === 'idle'

  const formatLastSync = () => {
    if (!lastSyncAt) return null
    const date = new Date(lastSyncAt)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
    return date.toLocaleDateString()
  }

  const handleSync = async () => {
    if (canSync) {
      await sync()
    }
  }

  return (
    <div 
      className={cn(
        'flex items-center justify-between px-3 py-2 text-xs rounded-lg cursor-pointer transition-colors',
        status.bgColor,
        canSync && 'hover:opacity-80'
      )}
      onClick={handleSync}
    >
      <div className="flex items-center gap-2">
        <span className={cn('text-sm', status.color, syncState === 'syncing' && 'animate-spin')}>
          {status.icon}
        </span>
        <span className={status.color}>{status.text}</span>
      </div>
      
      {lastSyncAt && syncState === 'idle' && (
        <span className="text-gray-400">
          上次同步: {formatLastSync()}
        </span>
      )}
      
      {canSync && pendingBackupCount > 0 && (
        <span className="text-blue-600 font-medium">点击同步</span>
      )}
    </div>
  )
}
