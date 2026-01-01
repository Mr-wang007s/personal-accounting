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

  // 初始化 Promise，供页面等待
  initPromise: null as Promise<void> | null,

  onLaunch() {
    // 初始化数据，保存 Promise 供页面等待
    this.initPromise = this.initializeApp()
  },

  async initializeApp() {
    try {
      // 加载用户配置
      const userProfile = StorageService.getUserProfile()
      const ledgers = StorageService.getLedgers()

      if (userProfile && ledgers.length > 0) {
        // 本地已有数据，直接初始化
        this.globalData.userProfile = userProfile
        this.globalData.ledgers = ledgers
        this.globalData.currentLedger = ledgers.find(l => l.id === userProfile.currentLedgerId) || ledgers[0]
        this.globalData.records = StorageService.getRecords()
        this.globalData.isInitialized = true

        // 云托管模式下自动登录
        const token = apiClient.getToken()
        if (token) {
          this.globalData.isLoggedIn = true
        } else {
          // 尝试自动登录（传入昵称和头像）
          this.tryAutoLogin(userProfile.nickname, userProfile.avatar)
        }
      } else {
        // 本地没有数据，尝试从云端恢复
        await this.tryRestoreFromCloud()
      }
    } catch (error) {
      console.error('初始化失败:', error)
    }
  },

  // 尝试从云端恢复数据（首次打开或清除缓存后）
  async tryRestoreFromCloud() {
    try {
      // 先尝试自动登录
      const loginResult = await syncService.autoLogin()
      if (!loginResult.success) {
        console.log('[App] 云端登录失败，需要引导')
        return
      }

      this.globalData.isLoggedIn = true
      console.log('[App] 云端登录成功，尝试恢复数据')

      // 从云端获取数据
      const restoreResult = await apiClient.restore()
      const cloudLedgers = restoreResult.ledgers || []
      const cloudRecords = restoreResult.records || []

      if (cloudLedgers.length > 0) {
        // 云端有账本数据，恢复到本地
        const ledgers = cloudLedgers.map(cl => ({
          id: cl.clientId,
          name: cl.name,
          icon: cl.icon,
          color: cl.color,
          createdAt: cl.createdAt,
          updatedAt: cl.updatedAt,
        }))

        const records = cloudRecords.map(cr => ({
          id: cr.clientId,
          type: cr.type,
          amount: cr.amount,
          category: cr.category,
          date: cr.date,
          note: cr.note,
          createdAt: cr.createdAt,
          updatedAt: cr.updatedAt,
          ledgerId: cr.ledgerId,
          syncStatus: 'synced' as const,
          serverId: cr.serverId,
        }))

        // 创建用户配置
        const userProfile = {
          id: `user_${Date.now()}`,
          nickname: loginResult.user?.nickname || '用户',
          avatar: loginResult.user?.avatar || '',
          currentLedgerId: ledgers[0].id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        // 保存到本地存储
        StorageService.saveUserProfile(userProfile)
        StorageService.saveLedgers(ledgers)
        StorageService.saveRecords(records)

        // 更新全局数据
        this.globalData.userProfile = userProfile
        this.globalData.ledgers = ledgers
        this.globalData.currentLedger = ledgers[0]
        this.globalData.records = records
        this.globalData.isInitialized = true

        console.log('[App] 从云端恢复数据成功，账本:', ledgers.length, '记录:', records.length)
      } else {
        console.log('[App] 云端无账本数据，需要引导')
      }
    } catch (error) {
      console.error('[App] 从云端恢复数据失败:', error)
    }
  },

  // 尝试自动登录（云托管模式）
  async tryAutoLogin(nickname?: string, avatar?: string) {
    try {
      const result = await syncService.autoLogin(nickname, avatar)
      if (result.success) {
        this.globalData.isLoggedIn = true
        console.log('[App] 自动登录成功')
        // 自动同步数据
        if (syncService.isAutoSyncEnabled()) {
          syncService.sync()
        }
      }
    } catch (error) {
      console.error('[App] 自动登录失败:', error)
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
