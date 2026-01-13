/**
 * 登录页面 - 手机号登录
 */

import { useState } from 'react'
import { Phone, Loader2, Wallet } from 'lucide-react'

interface LoginPageProps {
  onLoginSuccess: () => void
  isLoading?: boolean
  error?: string | null
  onLogin: (phone: string) => Promise<boolean>
}

export function LoginPage({ onLoginSuccess, isLoading, error, onLogin }: LoginPageProps) {
  const [phone, setPhone] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    // 简单的手机号格式验证
    const phoneRegex = /^1[3-9]\d{9}$/
    if (!phoneRegex.test(phone)) {
      setLocalError('请输入正确的手机号')
      return
    }

    setSubmitting(true)
    try {
      const success = await onLogin(phone)
      if (success) {
        onLoginSuccess()
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : '登录失败')
    } finally {
      setSubmitting(false)
    }
  }

  const displayError = localError || error

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo 和标题 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl mb-4">
            <Wallet className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">个人记账</h1>
          <p className="text-white/80">简单记录，轻松理财</p>
        </div>

        {/* 登录卡片 */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">
            手机号登录
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 手机号输入 */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                手机号
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="请输入手机号"
                  className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  disabled={isLoading || submitting}
                  autoComplete="tel"
                  data-testid="phone-input"
                />
              </div>
            </div>

            {/* 错误提示 */}
            {displayError && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm" data-testid="error-message">
                {displayError}
              </div>
            )}

            {/* 登录按钮 */}
            <button
              type="submit"
              disabled={isLoading || submitting || !phone}
              className="w-full bg-indigo-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              data-testid="login-button"
            >
              {(isLoading || submitting) ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  登录中...
                </>
              ) : (
                '开始记账'
              )}
            </button>
          </form>

          {/* 提示信息 */}
          <p className="mt-6 text-center text-sm text-gray-500">
            首次登录将自动创建账户
          </p>
        </div>

        {/* 底部信息 */}
        <p className="mt-8 text-center text-white/60 text-sm">
          © 2025 个人记账 · 数据安全加密存储
        </p>
      </div>
    </div>
  )
}
