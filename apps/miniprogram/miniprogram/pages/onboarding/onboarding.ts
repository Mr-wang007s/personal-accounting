/**
 * 首次使用引导页
 * 云托管版本 - 通过微信获取用户信息，自动登录
 * 重构：移除本地存储
 */
import { LedgerService } from '../../services/ledger'
import { authService } from '../../services/auth'

Page({
  data: {
    // 用户信息（从微信获取）
    nickname: '',
    avatarUrl: '',
    hasUserInfo: false,
    
    // 账本设置
    ledgerName: '',
    ledgerIcon: '📒',
    ledgerIcons: ['📒', '💰', '🏠', '🚗', '✈️', '🎮', '🛒', '💼', '🎓', '❤️', '🌟', '📱'],
    
    // 加载状态
    isLoading: false,
  },

  onLoad() {
    // 检查是否已初始化
    const app = getApp<IAppOption>()
    if (app.globalData.isInitialized) {
      wx.redirectTo({
        url: '/pages/index/index'
      })
    }
  },

  // 选择头像（微信头像选择器）
  onChooseAvatar(e: WechatMiniprogram.ChooseAvatarEvent) {
    const { avatarUrl } = e.detail
    this.setData({ 
      avatarUrl,
      hasUserInfo: true 
    })
  },

  // 输入昵称（微信昵称输入）
  onNicknameInput(e: WechatMiniprogram.Input) {
    const nickname = e.detail.value
    this.setData({ 
      nickname,
      hasUserInfo: !!nickname 
    })
  },

  // 输入账本名称
  onLedgerNameInput(e: WechatMiniprogram.Input) {
    this.setData({ ledgerName: e.detail.value })
  },

  // 选择图标
  selectIcon(e: WechatMiniprogram.TouchEvent) {
    const icon = e.currentTarget.dataset.icon
    this.setData({ ledgerIcon: icon })
  },

  // 完成引导
  async complete() {
    const { nickname, avatarUrl, ledgerName, ledgerIcon } = this.data

    // 验证必填项
    if (!nickname.trim()) {
      wx.showToast({ title: '请输入昵称', icon: 'none' })
      return
    }

    const finalLedgerName = ledgerName.trim() || '日常账本'

    this.setData({ isLoading: true })

    try {
      wx.showLoading({ title: '正在初始化...' })

      const app = getApp<IAppOption>()
      
      // 云托管自动登录
      let cloudConnected = false
      try {
        const loginResult = await authService.autoLogin(nickname.trim(), avatarUrl)
        if (loginResult.success) {
          cloudConnected = true
          app.globalData.isLoggedIn = true
          console.log('[Onboarding] 云端自动登录成功')
        }
      } catch (e) {
        console.error('[Onboarding] 云端登录失败:', e)
      }

      // 初始化本地数据（会同时在云端创建账本）
      await app.completeOnboarding(
        nickname.trim(), 
        finalLedgerName
      )

      // 更新账本图标
      if (ledgerIcon !== '📒') {
        const ledgers = app.globalData.ledgers
        if (ledgers.length > 0) {
          try {
            await LedgerService.updateLedger(ledgers[0].id, { icon: ledgerIcon })
          } catch (e) {
            console.error('[Onboarding] 更新账本图标失败:', e)
          }
        }
      }

      // 保存头像到用户配置（仅在内存中）
      if (avatarUrl) {
        const userProfile = app.globalData.userProfile
        if (userProfile) {
          userProfile.avatar = avatarUrl
          app.globalData.userProfile = userProfile
        }
      }

      wx.hideLoading()

      // 显示结果
      const message = cloudConnected ? '初始化成功！' : '欢迎使用！'
      wx.showToast({
        title: message,
        icon: 'success',
        duration: 1500,
      })

      setTimeout(() => {
        wx.reLaunch({
          url: '/pages/index/index'
        })
      }, 1500)

    } catch (error) {
      wx.hideLoading()
      this.setData({ isLoading: false })
      console.error('初始化失败:', error)
      wx.showToast({ title: '初始化失败，请重试', icon: 'none' })
    }
  },
})
