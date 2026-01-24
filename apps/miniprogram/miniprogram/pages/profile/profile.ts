/**
 * 个人中心页
 * 支持编辑头像和昵称
 * 首次用户显示 openId，可点击编辑
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
    version: '',

    // 新建账本弹窗
    showCreateModal: false,
    newLedgerName: '',
    newLedgerIcon: '📒',
    ledgerIcons: ['📒', '💰', '🏠', '🚗', '✈️', '🎮', '🛒', '💼', '🎓', '❤️', '🌟', '📱'],
    
    // 编辑用户信息弹窗
    showEditUserModal: false,
    editNickname: '',
    editAvatarUrl: '',
    
    // 加载状态
    isLoading: false,
    isCreating: false,
    isSaving: false,
  },

  onLoad() {
    // 获取小程序版本号
    const accountInfo = wx.getAccountInfoSync()
    const version = accountInfo.miniProgram.version || '开发版'
    this.setData({ version })
  },

  onShow() {
    this.loadData()
    // 设置自定义 tabBar 选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 })
    }
  },

  // 加载数据
  async loadData() {
    const app = getApp<IAppOption>()
    
    // 从云端刷新数据
    this.setData({ isLoading: true })
    try {
      await app.refreshData()
    } catch (error) {
      console.error('刷新数据失败:', error)
    }
    this.setData({ isLoading: false })

    const { userProfile, currentLedger, ledgers, records } = app.globalData

    // 计算每个账本的记录数
    const ledgersDisplay: LedgerDisplay[] = ledgers.map(l => ({
      ...l,
      recordCount: records.filter(r => r.ledgerId === l.id).length,
    }))

    // 生成头像文字（使用昵称首字或 ID 首字）
    const displayName = userProfile?.nickname || userProfile?.id || '?'
    const avatarText = displayName.charAt(0).toUpperCase()

    // 生成用户 ID 显示（显示 openId 前8位）
    const userIdDisplay = userProfile?.id ? userProfile.id.slice(0, 8) : ''

    this.setData({
      userProfile,
      currentLedger,
      ledgers: ledgersDisplay,
      avatarText,
      userIdDisplay,
    })
  },

  // 显示编辑用户信息弹窗
  showEditUser() {
    const { userProfile } = this.data
    this.setData({
      showEditUserModal: true,
      editNickname: userProfile?.nickname || '',
      editAvatarUrl: userProfile?.avatar || '',
    })
  },

  // 隐藏编辑用户信息弹窗
  hideEditUser() {
    this.setData({ showEditUserModal: false })
  },

  // 输入昵称
  onNicknameInput(e: WechatMiniprogram.Input) {
    this.setData({ editNickname: e.detail.value })
  },

  // 选择头像
  onChooseAvatar(e: WechatMiniprogram.CustomEvent<{ avatarUrl: string }>) {
    const avatarUrl = e.detail.avatarUrl
    if (avatarUrl) {
      this.setData({ editAvatarUrl: avatarUrl })
    }
  },

  // 保存用户信息
  async saveUserInfo() {
    const { editNickname, editAvatarUrl, isSaving } = this.data
    
    if (isSaving) return
    
    if (!editNickname.trim()) {
      wx.showToast({ title: '请输入昵称', icon: 'none' })
      return
    }

    this.setData({ isSaving: true })

    try {
      const app = getApp<IAppOption>()
      await app.updateUserProfile(editNickname.trim(), editAvatarUrl)
      
      wx.showToast({ title: '保存成功', icon: 'success' })
      this.hideEditUser()
      this.loadData()
    } catch (error) {
      console.error('保存用户信息失败:', error)
      wx.showToast({ title: '保存失败，请重试', icon: 'none' })
    } finally {
      this.setData({ isSaving: false })
    }
  },

  // 切换账本
  switchLedger(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id
    if (id === this.data.currentLedger?.id) return

    LedgerService.switchLedger(id)

    const app = getApp<IAppOption>()
    
    // 更新界面显示
    this.setData({
      currentLedger: app.globalData.currentLedger,
    })

    wx.showToast({ title: '已切换账本', icon: 'success' })
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
  async createLedger() {
    const { newLedgerName, newLedgerIcon, isCreating } = this.data

    if (isCreating) return

    if (!newLedgerName.trim()) {
      wx.showToast({ title: '请输入账本名称', icon: 'none' })
      return
    }

    this.setData({ isCreating: true })

    try {
      await LedgerService.createLedger(newLedgerName.trim(), newLedgerIcon)

      const app = getApp<IAppOption>()
      await app.refreshData()

      wx.showToast({ title: '创建成功', icon: 'success' })
      this.hideCreateLedger()
      this.loadData()
    } catch (error) {
      console.error('创建账本失败:', error)
      wx.showToast({ title: '创建失败，请重试', icon: 'none' })
    } finally {
      this.setData({ isCreating: false })
    }
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
          try {
            const success = await LedgerService.deleteLedger(id)
            wx.hideLoading()
            if (success) {
              const app = getApp<IAppOption>()
              await app.refreshData()

              wx.showToast({ title: '已删除', icon: 'success' })
              this.loadData()
            } else {
              wx.showToast({ title: '删除失败', icon: 'none' })
            }
          } catch (error) {
            wx.hideLoading()
            console.error('删除账本失败:', error)
            wx.showToast({ title: '删除失败，请重试', icon: 'none' })
          }
        }
      }
    })
  },
})
