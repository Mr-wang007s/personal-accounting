import { useState } from 'react'
import { Book, Trash2, LogOut, ChevronRight, Plus, Check } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRecords } from '@/context/RecordsContext'
import { useSync } from '@/context/SyncContext'
import { useLedger } from '@/context/LedgerContext'

interface ProfilePageProps {
  onNavigate?: (page: string) => void
}

export function ProfilePage(_props: ProfilePageProps) {
  const { records } = useRecords()
  const { ledgers, currentLedger, createLedger, switchLedger, deleteLedger } = useLedger()
  const { user, logout } = useSync()

  const [showLedgers, setShowLedgers] = useState(false)
  const [showNewLedger, setShowNewLedger] = useState(false)
  const [newLedgerName, setNewLedgerName] = useState('')

  const handleCreateLedger = async () => {
    if (!newLedgerName.trim()) return
    await createLedger(newLedgerName.trim())
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

  const handleLogout = () => {
    if (confirm('确定要退出登录吗？')) {
      logout()
    }
  }

  return (
    <div className="pb-24 px-4">
      {/* 头部 */}
      <div className="pt-4 pb-6">
        <h1 className="text-xl font-bold text-center text-slate-800">我的</h1>
        {user && (
          <p className="text-sm text-slate-500 text-center mt-1">
            {user.nickname || user.phone}
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

        {/* 退出登录 */}
        <Card>
          <CardContent className="p-4">
            <div 
              className="flex items-center gap-3 cursor-pointer"
              onClick={handleLogout}
            >
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <LogOut className="w-5 h-5 text-red-500" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-red-600">退出登录</div>
                <div className="text-sm text-slate-500">退出当前账号</div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
