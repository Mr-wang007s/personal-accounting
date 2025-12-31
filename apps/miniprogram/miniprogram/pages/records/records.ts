/**
 * 账单明细页
 */
import type { Record, CategoryStat, MonthlyData } from '../../shared/types'
import { getCategoryById, CATEGORY_COLORS } from '../../shared/constants'
import { formatAmount, getCurrentMonth, getCurrentYear } from '../../shared/utils'
import { RecordService } from '../../services/record'

interface RecordDisplay extends Record {
  categoryName: string
  categoryIcon: string
  categoryColor: string
  amountDisplay: string
}

interface GroupedRecordsDisplay {
  date: string
  dateLabel: string
  records: RecordDisplay[]
  totalIncome: number
  totalExpense: number
  incomeDisplay: string
  expenseDisplay: string
}

interface CategoryBreakdownDisplay extends CategoryStat {
  color: string
  amountDisplay: string
  percentDisplay: string
}

interface MonthlyTrendDisplay extends MonthlyData {
  incomeHeight: number
  expenseHeight: number
}

Page({
  data: {
    activeTab: 'records' as 'records' | 'stats',
    currentYear: getCurrentYear(),
    currentMonth: getCurrentMonth(),
    currentMonthStr: '',

    // 账单明细
    monthIncomeDisplay: '0.00',
    monthExpenseDisplay: '0.00',
    monthBalance: 0,
    monthBalanceDisplay: '0.00',
    groupedRecords: [] as GroupedRecordsDisplay[],

    // 统计分析
    totalIncomeDisplay: '0.00',
    totalExpenseDisplay: '0.00',
    monthlyTrend: [] as MonthlyTrendDisplay[],
    categoryBreakdown: [] as CategoryBreakdownDisplay[],
  },

  onLoad() {
    this.updateMonthStr()
  },

  onShow() {
    this.loadData()
  },

  // 更新月份字符串
  updateMonthStr() {
    const { currentYear, currentMonth } = this.data
    const monthStr = String(currentMonth).padStart(2, '0')
    this.setData({
      currentMonthStr: `${currentYear}-${monthStr}`
    })
  },

  // 加载数据
  loadData() {
    const app = getApp<IAppOption>()
    app.refreshData()

    const { currentLedger } = app.globalData
    if (!currentLedger) return

    if (this.data.activeTab === 'records') {
      this.loadRecords(currentLedger.id)
    } else {
      this.loadStats(currentLedger.id)
    }
  },

  // 加载账单明细
  loadRecords(ledgerId: string) {
    const { currentYear, currentMonth } = this.data
    const records = RecordService.getRecordsByMonth(ledgerId, currentYear, currentMonth)

    // 计算月度统计
    const stats = RecordService.calculateStatistics(records)

    // 按日期分组
    const grouped = RecordService.groupRecordsByDate(records)

    // 转换为显示格式
    const groupedRecords: GroupedRecordsDisplay[] = grouped.map(g => ({
      ...g,
      incomeDisplay: formatAmount(g.totalIncome),
      expenseDisplay: formatAmount(g.totalExpense),
      records: g.records.map(r => {
        const category = getCategoryById(r.category)
        return {
          ...r,
          categoryName: category?.name || '其他',
          categoryIcon: category?.icon || 'other',
          categoryColor: CATEGORY_COLORS[r.category] || '#94A3B8',
          amountDisplay: formatAmount(r.amount),
        }
      })
    }))

    this.setData({
      monthIncomeDisplay: formatAmount(stats.totalIncome),
      monthExpenseDisplay: formatAmount(stats.totalExpense),
      monthBalance: stats.balance,
      monthBalanceDisplay: formatAmount(Math.abs(stats.balance)),
      groupedRecords,
    })
  },

  // 加载统计数据
  loadStats(ledgerId: string) {
    const records = RecordService.getRecordsByLedger(ledgerId)
    const stats = RecordService.calculateStatistics(records)
    const monthlyTrend = RecordService.calculateMonthlyTrend(ledgerId)

    // 计算柱状图高度
    const maxValue = Math.max(
      ...monthlyTrend.map(m => Math.max(m.income, m.expense)),
      1
    )
    const maxHeight = 180

    const trendDisplay: MonthlyTrendDisplay[] = monthlyTrend.map(m => ({
      ...m,
      incomeHeight: Math.max((m.income / maxValue) * maxHeight, 8),
      expenseHeight: Math.max((m.expense / maxValue) * maxHeight, 8),
    }))

    // 转换分类统计
    const categoryBreakdown: CategoryBreakdownDisplay[] = stats.categoryBreakdown.map(c => ({
      ...c,
      color: CATEGORY_COLORS[c.category] || '#94A3B8',
      amountDisplay: formatAmount(c.amount),
      percentDisplay: c.percentage.toFixed(1),
    }))

    this.setData({
      totalIncomeDisplay: formatAmount(stats.totalIncome),
      totalExpenseDisplay: formatAmount(stats.totalExpense),
      monthlyTrend: trendDisplay,
      categoryBreakdown,
    })
  },

  // 切换 Tab
  switchTab(e: WechatMiniprogram.TouchEvent) {
    const tab = e.currentTarget.dataset.tab as 'records' | 'stats'
    if (tab !== this.data.activeTab) {
      this.setData({ activeTab: tab })
      this.loadData()
    }
  },

  // 上一个月
  prevMonth() {
    let { currentYear, currentMonth } = this.data
    currentMonth--
    if (currentMonth < 1) {
      currentMonth = 12
      currentYear--
    }
    this.setData({ currentYear, currentMonth })
    this.updateMonthStr()
    this.loadData()
  },

  // 下一个月
  nextMonth() {
    let { currentYear, currentMonth } = this.data
    const now = new Date()
    const maxYear = now.getFullYear()
    const maxMonth = now.getMonth() + 1

    // 不能超过当前月份
    if (currentYear === maxYear && currentMonth >= maxMonth) {
      return
    }

    currentMonth++
    if (currentMonth > 12) {
      currentMonth = 1
      currentYear++
    }
    this.setData({ currentYear, currentMonth })
    this.updateMonthStr()
    this.loadData()
  },

  // 月份选择变化
  onMonthChange(e: WechatMiniprogram.PickerChange) {
    const value = e.detail.value as string
    const [year, month] = value.split('-').map(Number)
    this.setData({
      currentYear: year,
      currentMonth: month,
      currentMonthStr: value,
    })
    this.loadData()
  },

  // 编辑记录
  editRecord(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/record/record?id=${id}`
    })
  },
})
