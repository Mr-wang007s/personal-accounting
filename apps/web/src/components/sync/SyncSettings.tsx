import { useState } from 'react'
import { useSync } from '@/context/SyncContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'

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
    autoSyncEnabled,
    lastSyncResult,
    discoverServer,
    login,
    sync,
    disconnect,
    setAutoSyncEnabled,
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
          连接家庭服务器，双向同步记账数据
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
            {/* 自动同步开关 */}
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div>
                <Label className="font-medium">自动备份同步</Label>
                <p className="text-xs text-gray-500 mt-0.5">
                  数据变更后自动双向同步
                </p>
              </div>
              <Switch
                checked={autoSyncEnabled}
                onCheckedChange={setAutoSyncEnabled}
              />
            </div>

            {/* 同步状态 */}
            <div className="p-3 bg-gray-50 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">状态</span>
                <span className="font-medium">
                  {syncState === 'syncing' ? '🔄 同步中...' : 
                   syncState === 'success' ? '✅ 同步成功' :
                   syncState === 'error' ? '❌ 同步失败' :
                   syncState === 'offline' ? '📴 离线' : '✓ 已就绪'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">待同步</span>
                <span className={`font-medium ${pendingCount > 0 ? 'text-orange-500' : 'text-green-600'}`}>
                  {pendingCount > 0 ? `${pendingCount} 条待上传` : '已同步'}
                </span>
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

            {/* 上次同步结果 */}
            {lastSyncResult && lastSyncResult.success && (
              <div className="p-3 bg-green-50 rounded-lg text-sm">
                <div className="font-medium text-green-700 mb-1">同步完成</div>
                <div className="grid grid-cols-2 gap-1 text-green-600">
                  <span>↓ 拉取: {lastSyncResult.pulled} 条</span>
                  <span>↑ 推送: {lastSyncResult.pushed} 条</span>
                  <span>⚡ 合并: {lastSyncResult.merged} 条</span>
                  {lastSyncResult.conflicts > 0 && (
                    <span className="text-yellow-600">⚠ 冲突: {lastSyncResult.conflicts} 条</span>
                  )}
                </div>
              </div>
            )}

            {/* 冲突详情 */}
            {lastSyncResult?.conflictRecords && lastSyncResult.conflictRecords.length > 0 && (
              <div className="p-3 bg-yellow-50 rounded-lg text-sm">
                <div className="font-medium text-yellow-700 mb-2">冲突记录（已自动解决）</div>
                <div className="space-y-1 text-yellow-600 max-h-32 overflow-y-auto">
                  {lastSyncResult.conflictRecords.slice(0, 5).map((conflict, i) => (
                    <div key={i} className="text-xs">
                      • {conflict.conflictType === 'update_update' ? '双方修改' : 
                         conflict.conflictType === 'update_delete' ? '本地修改/服务器删除' : 
                         '本地删除/服务器修改'} 
                      → 采用{conflict.resolvedBy === 'local' ? '本地' : '服务器'}版本
                    </div>
                  ))}
                  {lastSyncResult.conflictRecords.length > 5 && (
                    <div className="text-xs">...还有 {lastSyncResult.conflictRecords.length - 5} 条</div>
                  )}
                </div>
              </div>
            )}

            <Button 
              className="w-full" 
              onClick={handleSync}
              disabled={loading || syncState === 'syncing'}
            >
              {syncState === 'syncing' ? '同步中...' : '立即同步'}
            </Button>
          </div>
        )}

        {/* 说明 */}
        <div className="text-xs text-gray-400 space-y-1">
          <p>• 双向同步：本地 ↔ 服务器数据自动合并</p>
          <p>• 智能合并：按修改时间自动解决冲突</p>
          <p>• 离线优先：无网络时数据保存在本地</p>
        </div>
      </CardContent>
    </Card>
  )
}
