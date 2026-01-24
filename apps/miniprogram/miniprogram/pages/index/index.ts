/**
 * 首页
 * 自动等待初始化完成后加载数据
 * 无需引导页，新用户后端自动创建默认账本
 */
import type { Record, Ledger } from '../../shared/types'
import { getCategoryById, CATEGORY_COLORS } from '../../shared/constants'
import { formatAmount, formatShortDate, getCurrentMonth } from '../../shared/utils'
import { RecordService } from '../../services/record'

interface RecordDisplay extends Record {
  categoryName: string
  categoryIcon: string
  categoryColor: string
  amountDisplay: string
  dateLabel: string
}

Page({
  data: {
    currentLedger: null as Ledger | null,
    currentMonth: getCurrentMonth(),
    balance: 0,
    balanceDisplay: '0.00',
    incomeDisplay: '0.00',
    expenseDisplay: '0.00',
    recentRecords: [] as RecordDisplay[],
    // 渐进式加载状态
    isInitializing: true,    // 初始化中（显示骨架屏）
    isRefreshing: false,     // 数据刷新中（不阻塞UI）
    hasError: false,
    contentReady: false,     // 内容准备好（用于动画）
  },

  onLoad() {
    this.waitForInitialization()
  },

  onShow() {
    const app = getApp<IAppOption>()
    if (app.globalData.isInitialized) {
      this.loadData(false) // 非初始加载，仅刷新数据
    }
    // 设置自定义 tabBar 选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 })
    }
  },

  // 等待应用初始化完成
  async waitForInitialization() {
    const app = getApp<IAppOption>()
    
    this.setData({ isInitializing: true, hasError: false })
    
    try {
      // 等待 app 初始化完成
      if (app.initPromise) {
        await app.initPromise
      }
      
      // 检查是否已登录
      if (!app.globalData.isLoggedIn) {
        // 未登录，跳转到登录页
        wx.redirectTo({
          url: '/pages/onboarding/onboarding'
        })
        return
      }
      
      // 初始化完成后加载数据
      if (app.globalData.isInitialized) {
        await this.loadData(true)
      } else {
        // 如果初始化失败，显示错误状态
        this.setData({ isInitializing: false, hasError: true })
      }
    } catch (error) {
      console.error('[Index] 初始化等待失败:', error)
      this.setData({ isInitializing: false, hasError: true })
    }
  },

  // 重试加载
  async retryLoad() {
    const app = getApp<IAppOption>()
    
    this.setData({ isInitializing: true, hasError: false })
    
    try {
      await app.initializeApp()
      
      if (app.globalData.isInitialized) {
        await this.loadData(true)
      } else {
        this.setData({ isInitializing: false, hasError: true })
      }
    } catch (error) {
      console.error('[Index] 重试失败:', error)
      this.setData({ isInitializing: false, hasError: true })
    }
  },

  // 加载数据
  async loadData(isInitial = false) {
    const app = getApp<IAppOption>()
    
    // 初始加载用 isInitializing，后续刷新用 isRefreshing
    if (isInitial) {
      this.setData({ hasError: false })
    } else {
      this.setData({ isRefreshing: true, hasError: false })
    }
    
    try {
      // 从云端刷新数据
      await app.refreshData()
    } catch (error) {
      console.error('[Index] 刷新数据失败:', error)
      // 继续使用缓存数据
    }
    
    const { currentLedger, records } = app.globalData

    if (!currentLedger) {
      this.setData({ 
        isInitializing: false, 
        isRefreshing: false,
        contentReady: true
      })
      return
    }

    // 获取当前月份的记录
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1

    const monthRecords = records.filter(r => {
      if (r.ledgerId !== currentLedger.id) return false
      const date = new Date(r.date)
      return date.getFullYear() === currentYear && date.getMonth() + 1 === currentMonth
    })

    // 计算统计
    const stats = RecordService.calculateStatistics(monthRecords)

    // 获取最近5条记录
    const ledgerRecords = records
      .filter(r => r.ledgerId === currentLedger.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)

    const recentRecords: RecordDisplay[] = ledgerRecords.map(r => {
      const category = getCategoryById(r.category)
      return {
        ...r,
        categoryName: category?.name || '其他',
        categoryIcon: category?.icon || 'other',
        categoryColor: CATEGORY_COLORS[r.category] || '#94A3B8',
        amountDisplay: formatAmount(r.amount),
        dateLabel: formatShortDate(r.date),
      }
    })

    this.setData({
      currentLedger,
      currentMonth,
      balance: stats.balance,
      balanceDisplay: formatAmount(Math.abs(stats.balance)),
      incomeDisplay: formatAmount(stats.totalIncome),
      expenseDisplay: formatAmount(stats.totalExpense),
      recentRecords,
      isInitializing: false,
      isRefreshing: false,
    })
    
    // 延迟触发内容动画
    setTimeout(() => {
      this.setData({ contentReady: true })
    }, 50)
  },

  // 下拉刷新
  async onPullDownRefresh() {
    await this.loadData()
    wx.stopPullDownRefresh()
  },

  // 切换账本
  switchLedger() {
    wx.switchTab({
      url: '/pages/profile/profile'
    })
  },

  // 记收入
  goToRecordIncome() {
    wx.navigateTo({
      url: '/pages/record/record?type=income'
    })
  },

  // 记支出
  goToRecordExpense() {
    wx.navigateTo({
      url: '/pages/record/record?type=expense'
    })
  },

  // 查看全部记录
  goToRecords() {
    wx.switchTab({
      url: '/pages/records/records'
    })
  },

  // 编辑记录
  editRecord(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/record/record?id=${id}`
    })
  },
})
