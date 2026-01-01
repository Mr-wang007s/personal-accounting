/**
 * 个人中心页
 */
import type { Ledger, UserProfile } from '../../shared/types'
import { LedgerService } from '../../services/ledger'
import { StorageService } from '../../services/storage'
import { syncService, SyncState } from '../../services/sync'
import { apiClient } from '../../services/apiClient'

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

    // 同步相关（简化版）
    showSyncModal: false,
    syncState: 'idle' as SyncState,
    isConnected: false,
    isAuthenticated: false,
    serverUrl: '',
    inputServerUrl: 'http://192.168.1.100:3000',
    lastSyncAt: '',
    pendingBackupCount: 0, // 待备份数量
    autoSyncEnabled: true,
    syncError: '',
  },

  onLoad() {
    // 检查是否有特定操作
  },

  onShow() {
    this.loadData()
    this.loadSyncStatus()
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
      success: (res) => {
        if (res.confirm) {
          const success = LedgerService.deleteLedger(id)
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

  // 导出数据
  exportData() {
    const app = getApp<IAppOption>()
    const { records, ledgers, userProfile } = app.globalData

    const exportData = {
      exportTime: new Date().toISOString(),
      userProfile,
      ledgers,
      records,
    }

    // 复制到剪贴板
    wx.setClipboardData({
      data: JSON.stringify(exportData, null, 2),
      success: () => {
        wx.showToast({ title: '数据已复制到剪贴板', icon: 'none' })
      }
    })
  },

  // 清除当前账本数据
  clearCurrentLedgerData() {
    const { currentLedger } = this.data
    if (!currentLedger) return

    wx.showModal({
      title: '确认清除',
      content: `确定要清除账本"${currentLedger.name}"的所有记录吗？此操作不可恢复。`,
      confirmColor: '#EF4444',
      success: (res) => {
        if (res.confirm) {
          StorageService.clearLedgerData(currentLedger.id)

          const app = getApp<IAppOption>()
          app.refreshData()

          wx.showToast({ title: '已清除', icon: 'success' })
          this.loadData()
        }
      }
    })
  },

  // ==================== 同步功能（简化版 OneDrive 模式）====================

  // 加载同步状态
  loadSyncStatus() {
    const meta = syncService.getSyncMeta()
    const isConnected = syncService.isConnected()

    this.setData({
      serverUrl: meta.serverUrl || '',
      inputServerUrl: meta.serverUrl || 'http://192.168.1.100:3000',
      lastSyncAt: meta.lastSyncAt || '',
      pendingBackupCount: syncService.getPendingBackupCount(),
      isConnected: isConnected,
      isAuthenticated: apiClient.isAuthenticated(),
      autoSyncEnabled: syncService.isAutoSyncEnabled(),
    })

    // 检查连接状态
    if (meta.serverUrl) {
      this.checkConnection()
    }
  },

  // 检查连接
  async checkConnection() {
    const connected = await syncService.checkConnection()
    this.setData({
      isConnected: connected,
      syncState: connected ? 'idle' : 'offline',
    })
  },

  // 显示同步设置弹窗
  showSyncSettings() {
    this.setData({
      showSyncModal: true,
      syncError: '',
    })
  },

  // 隐藏同步设置弹窗
  hideSyncModal() {
    this.setData({ showSyncModal: false })
  },

  // 输入服务器地址
  onServerUrlInput(e: WechatMiniprogram.Input) {
    this.setData({ inputServerUrl: e.detail.value })
  },

  // 连接服务器（连接成功后自动使用昵称登录）
  async connectServer() {
    const { inputServerUrl, userProfile } = this.data
    if (!inputServerUrl.trim()) {
      this.setData({ syncError: '请输入服务器地址' })
      return
    }

    if (!userProfile?.nickname) {
      this.setData({ syncError: '请先设置用户昵称' })
      return
    }

    this.setData({ syncState: 'syncing', syncError: '' })

    try {
      const success = await syncService.discoverServer(inputServerUrl)
      if (success) {
        // 连接成功后自动使用昵称登录
        const loginSuccess = await syncService.login(userProfile.nickname)
        if (loginSuccess) {
          this.setData({
            isConnected: true,
            isAuthenticated: true,
            serverUrl: inputServerUrl,
            syncState: 'idle',
          })
          wx.showToast({ title: '连接成功', icon: 'success' })
          
          // 连接成功后自动同步
          if (this.data.autoSyncEnabled) {
            this.manualSync()
          }
        } else {
          this.setData({
            isConnected: true,
            serverUrl: inputServerUrl,
            syncError: '登录失败',
            syncState: 'error',
          })
        }
      } else {
        this.setData({
          syncError: '无法连接到服务器，请检查地址',
          syncState: 'error',
        })
      }
    } catch {
      this.setData({
        syncError: '连接失败',
        syncState: 'error',
      })
    }
  },

  // 断开连接
  disconnectServer() {
    wx.showModal({
      title: '确认断开',
      content: '断开连接后，数据将仅保存在本地。确定继续？',
      confirmColor: '#EF4444',
      success: (res) => {
        if (res.confirm) {
          syncService.disconnect()
          this.setData({
            isConnected: false,
            isAuthenticated: false,
            serverUrl: '',
            lastSyncAt: '',
            pendingBackupCount: 0,
            syncState: 'idle',
          })
          wx.showToast({ title: '已断开连接', icon: 'success' })
        }
      }
    })
  },

  // 手动同步（备份 + 恢复）
  async manualSync() {
    if (this.data.syncState === 'syncing') return

    this.setData({ syncState: 'syncing', syncError: '' })

    try {
      const result = await syncService.sync()

      if (result.success) {
        this.setData({
          syncState: 'success',
          lastSyncAt: syncService.getSyncMeta().lastSyncAt || '',
          pendingBackupCount: syncService.getPendingBackupCount(),
        })

        // 刷新应用数据
        const app = getApp<IAppOption>()
        app.refreshData()
        this.loadData()

        wx.showToast({
          title: `同步完成 ↑${result.uploaded} ↓${result.downloaded}`,
          icon: 'none',
        })

        setTimeout(() => {
          this.setData({ syncState: 'idle' })
        }, 2000)
      } else {
        this.setData({
          syncState: 'error',
          syncError: result.error || '同步失败',
        })
        setTimeout(() => {
          this.setData({ syncState: 'idle' })
        }, 3000)
      }
    } catch {
      this.setData({
        syncState: 'error',
        syncError: '同步失败',
      })
      setTimeout(() => {
        this.setData({ syncState: 'idle' })
      }, 3000)
    }
  },

  // 切换自动同步
  toggleAutoSync(e: WechatMiniprogram.SwitchChange) {
    const enabled = e.detail.value
    this.setData({ autoSyncEnabled: enabled })
    syncService.setAutoSync(enabled)
  },

  // 获取同步状态文本
  getSyncStateText(): string {
    const { syncState, isConnected, isAuthenticated } = this.data
    if (!isConnected) return '未连接'
    if (!isAuthenticated) return '未登录'
    switch (syncState) {
      case 'syncing': return '同步中...'
      case 'success': return '同步成功'
      case 'error': return '同步失败'
      case 'offline': return '离线'
      default: return '已就绪'
    }
  },
})
