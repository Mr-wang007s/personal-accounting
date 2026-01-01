import { useState } from 'react'
import { useSync } from '@/context/SyncContext'
import { useLedger } from '@/context/LedgerContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'

interface SyncSettingsProps {
  onClose?: () => void
}

export function SyncSettings({ onClose }: SyncSettingsProps) {
  const { ledgers } = useLedger()
  const {
    isConnected,
    isAuthenticated,
    serverUrl,
    userPhone,
    syncState,
    lastSyncAt,
    pendingBackupCount,
    autoSyncEnabled,
    lastSyncResult,
    discoverServer,
    login,
    sync,
    syncLedgers,
    disconnect,
    setAutoSyncEnabled,
  } = useSync()

  const [inputUrl, setInputUrl] = useState(serverUrl || 'http://127.0.0.1:3000')
  const [inputPhone, setInputPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'url' | 'phone'>('url')

  // 验证手机号格式
  const isValidPhone = (phone: string) => /^1[3-9]\d{9}$/.test(phone)

  const handleConnect = async () => {
    setError(null)
    setLoading(true)
    
    try {
      const success = await discoverServer(inputUrl)
      if (!success) {
        setError('无法连接到服务器，请检查地址是否正确')
        setLoading(false)
        return
      }
      // 连接成功，进入手机号输入步骤
      setStep('phone')
    } catch {
      setError('连接失败')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    if (!isValidPhone(inputPhone)) {
      setError('请输入有效的手机号')
      return
    }

    setError(null)
    setLoading(true)
    
    try {
      const result = await login(inputPhone)
      if (!result.success) {
        setError('登录失败')
        setLoading(false)
        return
      }

      // 登录成功后，同步本地账本到云端
      if (ledgers.length > 0) {
        await syncLedgers()
      }

      // 如果有待备份的记录，自动触发同步
      if (pendingBackupCount > 0) {
        await sync()
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
    if (confirm('断开连接后，数据将仅保存在本地。确定继续？')) {
      disconnect()
      setStep('url')
      setInputPhone('')
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>云备份设置</span>
          {onClose && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          )}
        </CardTitle>
        <CardDescription>
          连接服务器，自动备份数据到云端
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
            {error}
          </div>
        )}

        {/* 已连接状态 */}
        {isConnected && isAuthenticated ? (
          <div className="space-y-4">
            {/* 连接信息 */}
            <div className="p-3 bg-green-50 rounded-lg space-y-1">
              <p className="text-sm text-green-600">✓ 已连接到 {serverUrl}</p>
              <p className="text-sm text-green-600">📱 手机号: {userPhone}</p>
            </div>

            {/* 自动同步开关 */}
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div>
                <Label className="font-medium">自动云备份</Label>
                <p className="text-xs text-gray-500 mt-0.5">
                  联网时自动备份数据到云端
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
                <span className="text-gray-500">待备份</span>
                <span className={`font-medium ${pendingBackupCount > 0 ? 'text-orange-500' : 'text-green-600'}`}>
                  {pendingBackupCount > 0 ? `${pendingBackupCount} 条待上传` : '已同步'}
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
                  <span>↑ 上传: {lastSyncResult.uploaded} 条</span>
                  <span>↓ 下载: {lastSyncResult.downloaded} 条</span>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                className="flex-1" 
                onClick={handleSync}
                disabled={loading || syncState === 'syncing'}
              >
                {syncState === 'syncing' ? '同步中...' : '立即同步'}
              </Button>
              <Button variant="outline" onClick={handleDisconnect}>
                断开
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* 步骤 1: 连接服务器 */}
            {step === 'url' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>服务器地址</Label>
                  <div className="flex gap-2">
                    <Input
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      placeholder="http://127.0.0.1:3000"
                      disabled={loading}
                    />
                    <Button onClick={handleConnect} disabled={loading}>
                      {loading ? '连接中...' : '连接'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* 步骤 2: 输入手机号 */}
            {step === 'phone' && (
              <div className="space-y-4">
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600">✓ 已连接到 {inputUrl}</p>
                </div>
                
                <div className="space-y-2">
                  <Label>手机号</Label>
                  <p className="text-xs text-gray-500">
                    输入手机号进行登录/注册，首次登录将自动同步本地账本到云端
                  </p>
                  <Input
                    type="tel"
                    value={inputPhone}
                    onChange={(e) => setInputPhone(e.target.value)}
                    placeholder="请输入手机号"
                    disabled={loading}
                    maxLength={11}
                  />
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setStep('url')}
                    disabled={loading}
                  >
                    返回
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={handleLogin} 
                    disabled={loading || !isValidPhone(inputPhone)}
                  >
                    {loading ? '登录中...' : '登录并同步'}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* 说明 */}
        <div className="text-xs text-gray-400 space-y-1">
          <p>• 自动备份：联网时自动上传本地数据到云端</p>
          <p>• 自动恢复：联网时自动下载云端数据到本地</p>
          <p>• 删除提醒：删除已同步数据时会询问是否删除云端</p>
        </div>
      </CardContent>
    </Card>
  )
}
