/**
 * 首次使用引导页 - 邮箱验证码登录
 */
import { authService } from '../../services/auth'

Page({
  data: {
    email: '',
    code: '',
    isLoading: false,
    isSendingCode: false,
    countdown: 0,
    errorMsg: '',
    successMsg: '',
    canSendCode: false,
    canLogin: false,
  },

  // 倒计时定时器
  countdownTimer: null as number | null,

  onLoad() {
    // 检查是否已登录
    const app = getApp<IAppOption>()
    if (app.globalData.isLoggedIn && app.globalData.isInitialized) {
      wx.redirectTo({ url: '/pages/index/index' })
    }
  },

  onUnload() {
    // 清理定时器
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer)
      this.countdownTimer = null
    }
  },

  // 输入邮箱
  onEmailInput(e: WechatMiniprogram.Input) {
    const email = e.detail.value.trim()
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    this.setData({ 
      email,
      errorMsg: '',
      successMsg: '',
      canSendCode: isValidEmail && this.data.countdown === 0,
      canLogin: isValidEmail && this.data.code.length === 6,
    })
  },

  // 输入验证码
  onCodeInput(e: WechatMiniprogram.Input) {
    const code = e.detail.value
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.data.email)
    this.setData({ 
      code,
      errorMsg: '',
      canLogin: isValidEmail && code.length === 6,
    })
  },

  // 发送验证码
  async handleSendCode() {
    const { email, countdown, isSendingCode } = this.data

    // 验证邮箱
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.setData({ errorMsg: '请输入正确的邮箱地址' })
      return
    }

    if (countdown > 0 || isSendingCode) {
      return
    }

    this.setData({ isSendingCode: true, errorMsg: '', successMsg: '' })

    try {
      const result = await authService.sendEmailCode(email)
      
      if (!result.success) {
        throw new Error(result.error || '发送失败')
      }

      // 开发模式下显示验证码
      if (result.message?.includes('开发模式')) {
        this.setData({ successMsg: result.message })
      } else {
        wx.showToast({
          title: '验证码已发送',
          icon: 'success',
          duration: 1500,
        })
        this.setData({ successMsg: '验证码已发送，请查收邮箱' })
      }

      // 开始60秒倒计时
      this.startCountdown()

    } catch (error) {
      this.setData({ 
        isSendingCode: false,
        errorMsg: (error as Error).message || '发送失败，请重试',
      })
    }
  },

  // 开始倒计时
  startCountdown() {
    this.setData({ 
      isSendingCode: false,
      countdown: 60,
      canSendCode: false,
    })

    this.countdownTimer = setInterval(() => {
      const { countdown } = this.data
      if (countdown <= 1) {
        if (this.countdownTimer) {
          clearInterval(this.countdownTimer)
          this.countdownTimer = null
        }
        const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.data.email)
        this.setData({ 
          countdown: 0,
          canSendCode: isValidEmail,
        })
      } else {
        this.setData({ countdown: countdown - 1 })
      }
    }, 1000)
  },

  // 登录
  async handleLogin() {
    const { email, code, isLoading } = this.data

    if (isLoading) return

    // 验证邮箱
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.setData({ errorMsg: '请输入正确的邮箱地址' })
      return
    }

    // 验证验证码
    if (!code || code.length !== 6) {
      this.setData({ errorMsg: '请输入6位验证码' })
      return
    }

    this.setData({ isLoading: true, errorMsg: '' })

    try {
      const app = getApp<IAppOption>()
      const result = await app.loginWithEmailCode(email, code)
      
      if (!result.success) {
        throw new Error(result.error || '登录失败')
      }

      wx.showToast({
        title: result.isNewUser ? '注册成功！' : '登录成功！',
        icon: 'success',
        duration: 1500,
      })

      setTimeout(() => {
        wx.reLaunch({ url: '/pages/index/index' })
      }, 1500)

    } catch (error) {
      this.setData({ 
        isLoading: false,
        errorMsg: (error as Error).message || '登录失败，请重试',
      })
    }
  },
})
