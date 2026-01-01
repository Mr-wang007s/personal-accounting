import { useState } from 'react'
import { Book, Trash2, User, Cloud, ChevronRight, RefreshCw, Plus, Check } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRecords } from '@/context/RecordsContext'
import { useSync } from '@/context/SyncContext'
import { useLedger } from '@/context/LedgerContext'

interface ProfilePageProps {
  onNavigate?: (page: string) => void
}

export function ProfilePage(_props: ProfilePageProps) {
  const { records, clearAllData } = useRecords()
  const { userProfile, ledgers, currentLedger, createLedger, switchLedger, deleteLedger } = useLedger()
  const {
    isConnected,
    isAuthenticated,
    serverUrl,
    syncState,
    lastSyncAt,
    pendingBackupCount,
    autoSyncEnabled,
    discoverServer,
    login,
    sync,
    disconnect,
    setAutoSyncEnabled,
  } = useSync()

  const [showLedgers, setShowLedgers] = useState(false)
  const [showSyncConfig, setShowSyncConfig] = useState(false)
  const [showNewLedger, setShowNewLedger] = useState(false)
  const [newLedgerName, setNewLedgerName] = useState('')
  const [inputUrl, setInputUrl] = useState(serverUrl || userProfile?.serverUrl || 'http://127.0.0.1:3000')
  const [inputPhone, setInputPhone] = useState(userProfile?.phone || '')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleClearData = () => {
    if (confirm('确定要清除当前账本的所有记账数据吗？此操作不可恢复！')) {
      clearAllData()
    }
  }

  const handleCreateLedger = () => {
    if (!newLedgerName.trim()) return
    createLedger(newLedgerName.trim())
    setNewLedgerName('')
    setShowNewLedger(false)
  }

  const handleDeleteLedger = async (id: string, name: string) => {
    if (ledgers.length <= 1) {
      alert('至少保留一个账本')
      return
    }
    if (confirm(`确定要删除账本"${name}"吗？该账本下的所有记录也将被删除！`)) {
      await deleteLedger(id)
    }
  }

  const handleConnect = async () => {
    if (!inputPhone.trim()) {
      setError('请输入手机号')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const success = await discoverServer(inputUrl)
      if (!success) {
        setError('无法连接到服务器，请检查地址是否正确')
        setLoading(false)
        return
      }
      // 连接成功后使用手机号登录
      const loginResult = await login(inputPhone.trim(), userProfile?.nickname)
      if (!loginResult.success) {
        setError('登录失败')
      }
    } catch {
      setError('连接失败')
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
    if (confirm('断开连接将清除同步配置，确定继续？')) {
      disconnect()
    }
  }

  const formatLastSync = () => {
    if (!lastSyncAt) return '从未同步'
    const date = new Date(lastSyncAt)
    return date.toLocaleString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="pb-24 px-4">
      {/* 头部 */}
      <div className="pt-4 pb-6">
        <h1 className="text-xl font-bold text-center text-slate-800">我的</h1>
        {userProfile && (
          <p className="text-sm text-slate-500 text-center mt-1">
            {userProfile.nickname}{userProfile.phone ? ` · ${userProfile.phone}` : ''}
          </p>
        )}
      </div>

      <div className="space-y-4">
        {/* 账本管理 */}
        <Card>
          <CardContent className="p-0">
            {/* 当前账本 */}
            <div 
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50"
              onClick={() => setShowLedgers(!showLedgers)}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: currentLedger?.color ? `${currentLedger.color}20` : 'rgb(var(--primary) / 0.1)' }}
                >
                  <Book 
                    className="w-5 h-5" 
                    style={{ color: currentLedger?.color || 'rgb(var(--primary))' }}
                  />
                </div>
                <div>
                  <div className="font-medium text-slate-800">{currentLedger?.name || '我的账本'}</div>
                  <div className="text-sm text-slate-500">共 {records.length} 条记录</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">{ledgers.length} 个账本</span>
                <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${showLedgers ? 'rotate-90' : ''}`} />
              </div>
            </div>

            {/* 账本列表 */}
            {showLedgers && (
              <div className="border-t border-slate-100 bg-slate-50">
                {ledgers.map((ledger) => (
                  <div 
                    key={ledger.id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-slate-100 cursor-pointer"
                    onClick={() => {
                      switchLedger(ledger.id)
                      setShowLedgers(false)
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${ledger.color}20` }}
                      >
                        <Book className="w-4 h-4" style={{ color: ledger.color }} />
                      </div>
                      <span className="text-sm text-slate-700">{ledger.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {currentLedger?.id === ledger.id && (
                        <Check className="w-4 h-4 text-green-500" />
                      )}
                      {ledgers.length > 1 && (
                        <button
                          className="text-slate-400 hover:text-red-500 p-1"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteLedger(ledger.id, ledger.name)
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* 新建账本 */}
                {showNewLedger ? (
                  <div className="px-4 py-3 flex gap-2">
                    <Input
                      value={newLedgerName}
                      onChange={(e) => setNewLedgerName(e.target.value)}
                      placeholder="输入账本名称"
                      className="flex-1 h-8 text-sm"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateLedger()}
                    />
                    <Button size="sm" onClick={handleCreateLedger} className="h-8">
                      创建
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowNewLedger(false)} className="h-8">
                      取消
                    </Button>
                  </div>
                ) : (
                  <div 
                    className="flex items-center gap-3 px-4 py-3 text-primary cursor-pointer hover:bg-slate-100"
                    onClick={() => setShowNewLedger(true)}
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm">新建账本</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 同步设置 */}
        <Card>
          <CardContent className="p-0">
            {/* 自动同步开关 */}
            <div 
              className="flex items-center justify-between p-4 cursor-pointer"
              onClick={() => isConnected && isAuthenticated && setAutoSyncEnabled(!autoSyncEnabled)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                  <Cloud className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <div className="font-medium text-slate-800">自动同步</div>
                  <div className="text-sm text-slate-500">
                    {isConnected && isAuthenticated 
                      ? (autoSyncEnabled ? '已开启' : '已关闭')
                      : '未配置同步服务器'}
                  </div>
                </div>
              </div>
              <Switch
                checked={autoSyncEnabled && isConnected && isAuthenticated}
                onCheckedChange={setAutoSyncEnabled}
                disabled={!isConnected || !isAuthenticated}
              />
            </div>

            <div className="border-t border-slate-100" />

            {/* 同步配置 */}
            <div 
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50"
              onClick={() => setShowSyncConfig(!showSyncConfig)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <div className="font-medium text-slate-800">同步配置</div>
                  <div className="text-sm text-slate-500">
                    {isConnected && isAuthenticated 
                      ? `上次同步: ${formatLastSync()}`
                      : '点击配置同步服务器'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {pendingBackupCount > 0 && (
                  <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
                    {pendingBackupCount} 待同步
                  </span>
                )}
                <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${showSyncConfig ? 'rotate-90' : ''}`} />
              </div>
            </div>

            {/* 同步配置展开内容 */}
            {showSyncConfig && (
              <div className="px-4 pb-4 space-y-4 bg-slate-50">
                {error && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
                    {error}
                  </div>
                )}

                {/* 服务器连接 */}
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-sm text-slate-600">服务器地址</Label>
                    <Input
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      placeholder="http://127.0.0.1:3000"
                      disabled={isConnected || loading}
                    />
                  </div>
                  
                  {!isConnected && (
                    <div className="space-y-2">
                      <Label className="text-sm text-slate-600">手机号</Label>
                      <Input
                        value={inputPhone}
                        onChange={(e) => setInputPhone(e.target.value)}
                        placeholder="请输入手机号"
                        disabled={loading}
                        maxLength={11}
                      />
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    {!isConnected ? (
                      <Button onClick={handleConnect} disabled={loading || !inputUrl.trim() || !inputPhone.trim()} size="sm">
                        {loading ? '连接中...' : '连接'}
                      </Button>
                    ) : (
                      <Button variant="outline" onClick={handleDisconnect} size="sm">
                        断开
                      </Button>
                    )}
                  </div>
                  
                  {isConnected && (
                    <p className="text-xs text-green-600">✓ 已连接到 {serverUrl}</p>
                  )}
                </div>

                {/* 同步状态 */}
                {isConnected && isAuthenticated && (
                  <div className="space-y-3">
                    <div className="p-3 bg-white rounded-lg space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">状态</span>
                        <span className="font-medium">
                          {syncState === 'syncing' ? '🔄 同步中...' : 
                           syncState === 'success' ? '✅ 同步成功' :
                           syncState === 'error' ? '❌ 同步失败' :
                           syncState === 'offline' ? '📴 离线' : '✓ 已就绪'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">待同步</span>
                        <span className={`font-medium ${pendingBackupCount > 0 ? 'text-orange-500' : 'text-green-600'}`}>
                          {pendingBackupCount > 0 ? `${pendingBackupCount} 条` : '已同步'}
                        </span>
                      </div>
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={handleSync}
                      disabled={loading || syncState === 'syncing'}
                    >
                      {syncState === 'syncing' ? '同步中...' : '立即同步'}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 登录/退出（占位） */}
        <Card className="opacity-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                <User className="w-5 h-5 text-slate-400" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-slate-800">登录 / 退出</div>
                <div className="text-sm text-slate-500">即将推出</div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        {/* 清除数据 */}
        <Card>
          <CardContent className="p-4">
            <div 
              className="flex items-center gap-3 cursor-pointer"
              onClick={handleClearData}
            >
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-red-600">清除数据</div>
                <div className="text-sm text-slate-500">删除当前账本的所有记账数据</div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
