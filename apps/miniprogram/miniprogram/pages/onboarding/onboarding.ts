/**
 * 首次使用引导页
 */
import { LedgerService } from '../../services/ledger'

Page({
  data: {
    step: 1,
    nickname: '',
    ledgerName: '',
    ledgerIcon: '📒',
    ledgerIcons: ['📒', '💰', '🏠', '🚗', '✈️', '🎮', '🛒', '💼', '🎓', '❤️', '🌟', '📱'],
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

  // 输入昵称
  onNicknameInput(e: WechatMiniprogram.Input) {
    this.setData({ nickname: e.detail.value })
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

  // 下一步
  nextStep() {
    if (!this.data.nickname.trim()) {
      wx.showToast({ title: '请输入昵称', icon: 'none' })
      return
    }
    this.setData({ step: 2 })
  },

  // 上一步
  prevStep() {
    this.setData({ step: 1 })
  },

  // 完成引导
  async complete() {
    const { nickname, ledgerName, ledgerIcon } = this.data

    if (!nickname.trim()) {
      wx.showToast({ title: '请输入昵称', icon: 'none' })
      return
    }

    if (!ledgerName.trim()) {
      wx.showToast({ title: '请输入账本名称', icon: 'none' })
      return
    }

    try {
      wx.showLoading({ title: '正在初始化...' })

      const app = getApp<IAppOption>()
      await app.completeOnboarding(nickname.trim(), ledgerName.trim())

      // 更新账本图标
      if (ledgerIcon !== '📒') {
        const ledgers = app.globalData.ledgers
        if (ledgers.length > 0) {
          LedgerService.updateLedger(ledgers[0].id, { icon: ledgerIcon })
          app.refreshData()
        }
      }

      wx.hideLoading()

      wx.showToast({
        title: '欢迎使用！',
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
      console.error('初始化失败:', error)
      wx.showToast({ title: '初始化失败，请重试', icon: 'none' })
    }
  },
})
