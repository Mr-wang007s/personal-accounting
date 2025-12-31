/**
 * 首页
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
  },

  onLoad() {
    this.checkInitialization()
  },

  onShow() {
    const app = getApp<IAppOption>()
    if (app.globalData.isInitialized) {
      this.loadData()
    }
  },

  // 检查是否已初始化
  checkInitialization() {
    const app = getApp<IAppOption>()
    if (!app.globalData.isInitialized) {
      // 跳转到引导页
      wx.redirectTo({
        url: '/pages/onboarding/onboarding'
      })
    } else {
      this.loadData()
    }
  },

  // 加载数据
  loadData() {
    const app = getApp<IAppOption>()
    app.refreshData()

    const { currentLedger, records } = app.globalData

    if (!currentLedger) return

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
    })
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
