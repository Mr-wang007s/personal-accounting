import { useState } from 'react'
import { useSync } from '@/context/SyncContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface SyncSettingsProps {
  onClose?: () => void
}

export function SyncSettings({ onClose }: SyncSettingsProps) {
  const {
    isConnected,
    isAuthenticated,
    serverUrl,
    syncState,
    lastSyncAt,
    pendingCount,
    discoverServer,
    login,
    sync,
    fullSync,
    disconnect,
  } = useSync()

  const [inputUrl, setInputUrl] = useState(serverUrl || 'http://192.168.1.100:3000')
  const [inputIdentifier, setInputIdentifier] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleConnect = async () => {
    setError(null)
    setLoading(true)
    
    try {
      const success = await discoverServer(inputUrl)
      if (!success) {
        setError('无法连接到服务器，请检查地址是否正确')
      }
    } catch {
      setError('连接失败')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    if (!inputIdentifier.trim()) {
      setError('请输入用户标识')
      return
    }

    setError(null)
    setLoading(true)
    
    try {
      const success = await login(inputIdentifier)
      if (!success) {
        setError('登录失败')
      }
    } catch {
      setError('登录失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    setError(null)
    setLoading(true)
    
    try {
      const result = await sync()
      if (!result.success) {
        setError(result.error || '同步失败')
      }
    } catch {
      setError('同步失败')
    } finally {
      setLoading(false)
    }
  }

  const handleFullSync = async () => {
    if (!confirm('全量同步将用服务器数据覆盖本地数据，确定继续？')) {
      return
    }

    setError(null)
    setLoading(true)
    
    try {
      const result = await fullSync()
      if (!result.success) {
        setError(result.error || '全量同步失败')
      }
    } catch {
      setError('全量同步失败')
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = () => {
    if (confirm('断开连接将清除同步数据，确定继续？')) {
      disconnect()
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>数据同步设置</span>
          {onClose && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          )}
        </CardTitle>
        <CardDescription>
          连接家庭服务器，同步记账数据
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
            {error}
          </div>
        )}

        {/* 步骤 1: 连接服务器 */}
        <div className="space-y-2">
          <Label>服务器地址</Label>
          <div className="flex gap-2">
            <Input
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="http://192.168.1.100:3000"
              disabled={isConnected || loading}
            />
            {!isConnected ? (
              <Button onClick={handleConnect} disabled={loading}>
                {loading ? '连接中...' : '连接'}
              </Button>
            ) : (
              <Button variant="outline" onClick={handleDisconnect}>
                断开
              </Button>
            )}
          </div>
          {isConnected && (
            <p className="text-sm text-green-600">✓ 已连接到 {serverUrl}</p>
          )}
        </div>

        {/* 步骤 2: 登录 */}
        {isConnected && !isAuthenticated && (
          <div className="space-y-2">
            <Label>用户标识（开发模式）</Label>
            <div className="flex gap-2">
              <Input
                value={inputIdentifier}
                onChange={(e) => setInputIdentifier(e.target.value)}
                placeholder="输入任意标识，如: test_user"
                disabled={loading}
              />
              <Button onClick={handleLogin} disabled={loading}>
                {loading ? '登录中...' : '登录'}
              </Button>
            </div>
          </div>
        )}

        {/* 步骤 3: 同步操作 */}
        {isConnected && isAuthenticated && (
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">状态</span>
                <span className="font-medium">
                  {syncState === 'syncing' ? '同步中...' : '已就绪'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">待同步</span>
                <span className="font-medium">{pendingCount} 条</span>
              </div>
              {lastSyncAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500">上次同步</span>
                  <span className="font-medium">
                    {new Date(lastSyncAt).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button 
                className="flex-1" 
                onClick={handleSync}
                disabled={loading || syncState === 'syncing'}
              >
                {syncState === 'syncing' ? '同步中...' : '立即同步'}
              </Button>
              <Button 
                variant="outline"
                onClick={handleFullSync}
                disabled={loading || syncState === 'syncing'}
              >
                全量同步
              </Button>
            </div>
          </div>
        )}

        {/* 说明 */}
        <div className="text-xs text-gray-400 space-y-1">
          <p>• 连接到局域网内的家庭服务器</p>
          <p>• 数据优先保存在本地，连接服务器后自动同步</p>
          <p>• 全量同步会用服务器数据覆盖本地数据</p>
        </div>
      </CardContent>
    </Card>
  )
}
