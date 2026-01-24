/**
 * 首次使用引导页 - 手机号登录
 */

Page({
  data: {
    phone: '',
    isLoading: false,
    errorMsg: '',
  },

  onLoad() {
    // 检查是否已登录
    const app = getApp<IAppOption>()
    if (app.globalData.isLoggedIn && app.globalData.isInitialized) {
      wx.redirectTo({ url: '/pages/index/index' })
    }
  },

  // 输入手机号
  onPhoneInput(e: WechatMiniprogram.Input) {
    this.setData({ 
      phone: e.detail.value,
      errorMsg: '',
    })
  },

  // 登录
  async handleLogin() {
    const { phone } = this.data

    // 验证手机号
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      this.setData({ errorMsg: '请输入正确的手机号' })
      return
    }

    this.setData({ isLoading: true, errorMsg: '' })

    try {
      const app = getApp<IAppOption>()
      const result = await app.loginWithPhone(phone)
      
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
