/**
 * 个人中心页
 */
import type { Ledger, UserProfile } from '../../shared/types'
import { LedgerService } from '../../services/ledger'

interface LedgerDisplay extends Ledger {
  recordCount: number
}

Page({
  data: {
    userProfile: null as UserProfile | null,
    currentLedger: null as Ledger | null,
    ledgers: [] as LedgerDisplay[],
    avatarText: '',
    userIdDisplay: '',

    // 新建账本弹窗
    showCreateModal: false,
    newLedgerName: '',
    newLedgerIcon: '📒',
    ledgerIcons: ['📒', '💰', '🏠', '🚗', '✈️', '🎮', '🛒', '💼', '🎓', '❤️', '🌟', '📱'],
  },

  onLoad() {
    // 检查是否有特定操作
  },

  onShow() {
    this.loadData()
    // 设置自定义 tabBar 选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 })
    }
  },

  // 加载数据
  loadData() {
    const app = getApp<IAppOption>()
    app.refreshData()

    const { userProfile, currentLedger, ledgers, records } = app.globalData

    // 计算每个账本的记录数
    const ledgersDisplay: LedgerDisplay[] = ledgers.map(l => ({
      ...l,
      recordCount: records.filter(r => r.ledgerId === l.id).length,
    }))

    // 生成头像文字
    const avatarText = userProfile?.nickname ? userProfile.nickname.charAt(0).toUpperCase() : '?'

    // 生成用户 ID 显示
    const userIdDisplay = userProfile?.id ? userProfile.id.slice(0, 8) : ''

    this.setData({
      userProfile,
      currentLedger,
      ledgers: ledgersDisplay,
      avatarText,
      userIdDisplay,
    })
  },

  // 切换账本
  switchLedger(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id
    if (id === this.data.currentLedger?.id) return

    LedgerService.switchLedger(id)

    const app = getApp<IAppOption>()
    app.refreshData()

    wx.showToast({ title: '已切换账本', icon: 'success' })
    this.loadData()
  },

  // 显示新建账本弹窗
  showCreateLedger() {
    this.setData({
      showCreateModal: true,
      newLedgerName: '',
      newLedgerIcon: '📒',
    })
  },

  // 隐藏新建账本弹窗
  hideCreateLedger() {
    this.setData({ showCreateModal: false })
  },

  // 输入账本名称
  onLedgerNameInput(e: WechatMiniprogram.Input) {
    this.setData({ newLedgerName: e.detail.value })
  },

  // 选择账本图标
  selectLedgerIcon(e: WechatMiniprogram.TouchEvent) {
    const icon = e.currentTarget.dataset.icon
    this.setData({ newLedgerIcon: icon })
  },

  // 创建账本
  createLedger() {
    const { newLedgerName, newLedgerIcon } = this.data

    if (!newLedgerName.trim()) {
      wx.showToast({ title: '请输入账本名称', icon: 'none' })
      return
    }

    LedgerService.createLedger(newLedgerName.trim(), newLedgerIcon)

    const app = getApp<IAppOption>()
    app.refreshData()

    wx.showToast({ title: '创建成功', icon: 'success' })
    this.hideCreateLedger()
    this.loadData()
  },

  // 删除账本
  deleteLedger(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id
    const name = e.currentTarget.dataset.name

    if (this.data.ledgers.length <= 1) {
      wx.showToast({ title: '至少保留一个账本', icon: 'none' })
      return
    }

    wx.showModal({
      title: '确认删除',
      content: `删除账本"${name}"后，该账本下的所有记录都将被删除，确定要删除吗？`,
      confirmColor: '#EF4444',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' })
          const success = await LedgerService.deleteLedger(id)
          wx.hideLoading()
          if (success) {
            const app = getApp<IAppOption>()
            app.refreshData()

            wx.showToast({ title: '已删除', icon: 'success' })
            this.loadData()
          }
        }
      }
    })
  },

})
