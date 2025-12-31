import { useState } from 'react'
import { Book, User, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { useLedger } from '@/context/LedgerContext'

interface OnboardingPageProps {
  onComplete: () => void
}

export function OnboardingPage({ onComplete }: OnboardingPageProps) {
  const { initialize } = useLedger()
  const [step, setStep] = useState(1)
  const [nickname, setNickname] = useState('')
  const [ledgerName, setLedgerName] = useState('我的账本')
  const [error, setError] = useState('')

  const handleNext = () => {
    if (step === 1) {
      if (!nickname.trim()) {
        setError('请输入昵称')
        return
      }
      setError('')
      setStep(2)
    } else {
      if (!ledgerName.trim()) {
        setError('请输入账本名称')
        return
      }
      // 完成初始化
      initialize(nickname.trim(), ledgerName.trim())
      onComplete()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-primary/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-6 px-6">
          {/* 步骤指示器 */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className={`w-2 h-2 rounded-full transition-colors ${step >= 1 ? 'bg-primary' : 'bg-slate-200'}`} />
            <div className={`w-8 h-0.5 transition-colors ${step >= 2 ? 'bg-primary' : 'bg-slate-200'}`} />
            <div className={`w-2 h-2 rounded-full transition-colors ${step >= 2 ? 'bg-primary' : 'bg-slate-200'}`} />
          </div>

          {step === 1 ? (
            <>
              {/* 步骤 1: 输入昵称 */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-slate-800 mb-2">欢迎使用</h1>
                <p className="text-slate-500">请先设置您的昵称</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Input
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="输入您的昵称"
                    className="text-center text-lg h-12"
                    maxLength={20}
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                  />
                  {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
                </div>

                <Button 
                  className="w-full h-12 text-base" 
                  onClick={handleNext}
                >
                  下一步
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* 步骤 2: 创建账本 */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                  <Book className="w-8 h-8 text-green-500" />
                </div>
                <h1 className="text-2xl font-bold text-slate-800 mb-2">创建账本</h1>
                <p className="text-slate-500">为您的第一个账本取个名字</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Input
                    value={ledgerName}
                    onChange={(e) => setLedgerName(e.target.value)}
                    placeholder="账本名称"
                    className="text-center text-lg h-12"
                    maxLength={20}
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                  />
                  {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    className="flex-1 h-12"
                    onClick={() => setStep(1)}
                  >
                    上一步
                  </Button>
                  <Button 
                    className="flex-1 h-12 text-base" 
                    onClick={handleNext}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    开始记账
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* 底部提示 */}
          <p className="text-xs text-slate-400 text-center mt-8">
            数据将安全保存在您的设备上
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
