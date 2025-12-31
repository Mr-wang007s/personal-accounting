/**
 * 小程序入口文件
 */
import { StorageService } from './services/storage'
import { LedgerService } from './services/ledger'
import { apiClient } from './services/apiClient'
import { syncService } from './services/sync'

App<IAppOption>({
  globalData: {
    userProfile: null,
    currentLedger: null,
    ledgers: [],
    records: [],
    isInitialized: false,
    isLoggedIn: false,
  },

  onLaunch() {
    // 初始化数据
    this.initializeApp()
  },

  async initializeApp() {
    try {
      // 加载用户配置
      const userProfile = StorageService.getUserProfile()
      const ledgers = StorageService.getLedgers()

      if (userProfile && ledgers.length > 0) {
        // 已初始化用户
        this.globalData.userProfile = userProfile
        this.globalData.ledgers = ledgers
        this.globalData.currentLedger = ledgers.find(l => l.id === userProfile.currentLedgerId) || ledgers[0]
        this.globalData.records = StorageService.getRecords()
        this.globalData.isInitialized = true

        // 检查是否已登录（有 token）
        const token = apiClient.getToken()
        if (token) {
          this.globalData.isLoggedIn = true
          // 恢复服务器连接
          const syncMeta = syncService.getSyncMeta()
          if (syncMeta.serverUrl) {
            apiClient.setBaseUrl(syncMeta.serverUrl)
          }
        }
      }
    } catch (error) {
      console.error('初始化失败:', error)
    }
  },

  // 完成引导后初始化
  async completeOnboarding(nickname: string, ledgerName: string, serverUrl?: string) {
    const result = await LedgerService.initializeUser(nickname, ledgerName, serverUrl)
    this.globalData.userProfile = result.userProfile
    this.globalData.ledgers = [result.ledger]
    this.globalData.currentLedger = result.ledger
    this.globalData.records = []
    this.globalData.isInitialized = true
    this.globalData.isLoggedIn = result.registered
    return result
  },

  // 刷新数据
  refreshData() {
    this.globalData.records = StorageService.getRecords()
    this.globalData.ledgers = StorageService.getLedgers()
    if (this.globalData.userProfile) {
      this.globalData.currentLedger = this.globalData.ledgers.find(
        l => l.id === this.globalData.userProfile!.currentLedgerId
      ) || this.globalData.ledgers[0]
    }
  }
})
