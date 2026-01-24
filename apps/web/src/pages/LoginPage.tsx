/**
 * 登录页面 - 邮箱验证码登录
 */

import { useState, useEffect, useCallback } from 'react'
import { Mail, Lock, Loader2, Wallet } from 'lucide-react'

interface LoginPageProps {
  onLoginSuccess: () => void
  isLoading?: boolean
  error?: string | null
  onLogin: (phone: string) => Promise<boolean>
  onSendEmailCode?: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>
  onEmailLogin?: (email: string, code: string) => Promise<boolean>
}

export function LoginPage({ 
  onLoginSuccess, 
  isLoading, 
  error, 
  onLogin,
  onSendEmailCode,
  onEmailLogin,
}: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [countdown, setCountdown] = useState(0)

  // 是否启用验证码模式
  const emailEnabled = !!onSendEmailCode && !!onEmailLogin

  // 倒计时
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  // 验证邮箱格式
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  // 发送验证码
  const handleSendCode = useCallback(async () => {
    if (!isValidEmail || sendingCode || countdown > 0 || !onSendEmailCode) return

    setLocalError(null)
    setSuccessMessage(null)
    setSendingCode(true)

    try {
      const result = await onSendEmailCode(email)
      if (result.success) {
        setCountdown(60)
        // 开发模式下显示验证码
        if (result.message?.includes('开发模式')) {
          setSuccessMessage(result.message)
        } else {
          setSuccessMessage('验证码已发送，请查收邮箱')
        }
      } else {
        setLocalError(result.error || '发送失败')
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : '发送失败')
    } finally {
      setSendingCode(false)
    }
  }, [email, isValidEmail, sendingCode, countdown, onSendEmailCode])

  // 提交登录
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    setSuccessMessage(null)

    // 邮箱验证码模式
    if (emailEnabled) {
      if (!isValidEmail) {
        setLocalError('请输入正确的邮箱地址')
        return
      }
      if (!code || code.length !== 6) {
        setLocalError('请输入6位验证码')
        return
      }

      setSubmitting(true)
      try {
        const success = await onEmailLogin!(email, code)
        if (success) {
          onLoginSuccess()
        }
      } catch (err) {
        setLocalError(err instanceof Error ? err.message : '登录失败')
      } finally {
        setSubmitting(false)
      }
    } else {
      // 无验证码模式（开发测试）- 使用邮箱作为手机号
      if (!isValidEmail) {
        setLocalError('请输入正确的邮箱地址')
        return
      }

      setSubmitting(true)
      try {
        const success = await onLogin(email)
        if (success) {
          onLoginSuccess()
        }
      } catch (err) {
        setLocalError(err instanceof Error ? err.message : '登录失败')
      } finally {
        setSubmitting(false)
      }
    }
  }

  const displayError = localError || error
  const canLogin = emailEnabled ? (isValidEmail && code.length === 6) : isValidEmail

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
            邮箱登录
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 邮箱输入 */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                邮箱地址
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.trim())}
                  placeholder="请输入邮箱地址"
                  className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  disabled={isLoading || submitting}
                  autoComplete="email"
                  data-testid="email-input"
                />
              </div>
            </div>

            {/* 验证码输入（如果启用） */}
            {emailEnabled && (
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                  验证码
                </label>
                <div className="relative flex gap-3">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="code"
                      type="text"
                      inputMode="numeric"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="请输入验证码"
                      className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      disabled={isLoading || submitting}
                      autoComplete="one-time-code"
                      data-testid="code-input"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={!isValidEmail || sendingCode || countdown > 0}
                    className="flex-shrink-0 px-4 py-3 bg-indigo-50 text-indigo-600 font-medium rounded-xl hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                    data-testid="send-code-button"
                  >
                    {sendingCode ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : countdown > 0 ? (
                      `${countdown}s`
                    ) : (
                      '获取验证码'
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* 成功提示 */}
            {successMessage && (
              <div className="bg-green-50 text-green-600 px-4 py-3 rounded-xl text-sm" data-testid="success-message">
                {successMessage}
              </div>
            )}

            {/* 错误提示 */}
            {displayError && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm" data-testid="error-message">
                {displayError}
              </div>
            )}

            {/* 登录按钮 */}
            <button
              type="submit"
              disabled={isLoading || submitting || !canLogin}
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
