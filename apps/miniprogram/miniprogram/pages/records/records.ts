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
  incomeDisplay: string
  expenseDisplay: string
  isSelected: boolean
}

interface CategoryPieData {
  category: string
  name: string
  amount: number
  percentage: number
  percentDisplay: string
  color: string
  rotation: number
}

interface BarDetailData {
  month: string
  income: string
  expense: string
  balance: string
  balancePositive: boolean
  total: string
  incomePercent: number
  expensePercent: number
  hasData: boolean
  expenseCategories: CategoryPieData[]
  incomeCategories: CategoryPieData[]
}

// 时间范围选项
type TimeRange = 'month' | '3months' | '6months' | 'year' | 'all'

interface TimeRangeOption {
  key: TimeRange
  label: string
}

const TIME_RANGE_OPTIONS: TimeRangeOption[] = [
  { key: 'month', label: '本月' },
  { key: '3months', label: '近3月' },
  { key: '6months', label: '近6月' },
  { key: 'year', label: '本年' },
  { key: 'all', label: '全部' },
]

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

    // 新增：时间范围和交互
    timeRangeOptions: TIME_RANGE_OPTIONS,
    selectedTimeRange: '6months' as TimeRange,
    statsType: 'expense' as 'expense' | 'income',  // 收入/支出切换
    
    // 柱状图点击弹窗
    showBarDetail: false,
    barDetailData: {
      month: '',
      income: '0.00',
      expense: '0.00',
      balance: '0.00',
      balancePositive: true,
      total: '0.00',
      incomePercent: 0,
      expensePercent: 0,
      hasData: false,
      expenseCategories: [] as CategoryPieData[],
      incomeCategories: [] as CategoryPieData[],
    } as BarDetailData,
    
    // 图表滚动
    needScroll: false,
    scrollToView: '',
  },

  onLoad() {
    this.updateMonthStr()
  },

  onShow() {
    this.loadData()
    // 设置自定义 tabBar 选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }
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
    const { selectedTimeRange, statsType } = this.data
    const records = RecordService.getRecordsByLedger(ledgerId)
    
    // 根据时间范围过滤记录
    const filteredRecords = this.filterRecordsByTimeRange(records, selectedTimeRange)
    const stats = RecordService.calculateStatistics(filteredRecords)
    
    // 根据时间范围获取月度趋势
    const monthCount = this.getMonthCountByRange(selectedTimeRange)
    const monthlyTrend = RecordService.calculateMonthlyTrend(ledgerId, monthCount)

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
      incomeDisplay: formatAmount(m.income),
      expenseDisplay: formatAmount(m.expense),
      isSelected: false,
    }))

    // 根据收入/支出类型筛选分类统计
    const typeFilteredRecords = filteredRecords.filter(r => r.type === statsType)
    const typeStats = RecordService.calculateStatistics(typeFilteredRecords)
    
    // 转换分类统计
    const categoryBreakdown: CategoryBreakdownDisplay[] = typeStats.categoryBreakdown.map(c => ({
      ...c,
      color: CATEGORY_COLORS[c.category] || '#94A3B8',
      amountDisplay: formatAmount(c.amount),
      percentDisplay: c.percentage.toFixed(1),
    }))

    // 判断是否需要滚动
    const needScroll = this.isNeedScroll(selectedTimeRange)
    
    this.setData({
      totalIncomeDisplay: formatAmount(stats.totalIncome),
      totalExpenseDisplay: formatAmount(stats.totalExpense),
      monthlyTrend: trendDisplay,
      categoryBreakdown,
      needScroll,
      // 滚动到最新月份（最右侧）
      scrollToView: needScroll && trendDisplay.length > 0 ? `bar-${trendDisplay.length - 1}` : '',
    })
  },

  // 根据时间范围过滤记录
  filterRecordsByTimeRange(records: Record[], range: TimeRange): Record[] {
    if (range === 'all') return records
    
    const now = new Date()
    let startDate: Date
    
    switch (range) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case '3months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1)
        break
      case '6months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1)
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      default:
        return records
    }
    
    const startStr = startDate.toISOString().slice(0, 10)
    return records.filter(r => r.date >= startStr)
  },

  // 根据时间范围获取月数
  getMonthCountByRange(range: TimeRange): number {
    switch (range) {
      case 'month': return 1
      case '3months': return 3
      case '6months': return 6
      case 'year': return 12
      case 'all': return 24  // 全部显示更多月份
      default: return 6
    }
  },

  // 是否需要滚动（超过6个月时启用滚动）
  isNeedScroll(range: TimeRange): boolean {
    return range === 'year' || range === 'all'
  },

  // 切换时间范围
  onTimeRangeChange(e: WechatMiniprogram.TouchEvent) {
    const range = e.currentTarget.dataset.range as TimeRange
    if (range !== this.data.selectedTimeRange) {
      this.setData({ selectedTimeRange: range })
      this.loadData()
    }
  },

  // 切换收入/支出统计类型
  onStatsTypeChange(e: WechatMiniprogram.TouchEvent) {
    const type = e.currentTarget.dataset.type as 'expense' | 'income'
    if (type !== this.data.statsType) {
      this.setData({ statsType: type })
      this.loadData()
    }
  },

  // 柱状图点击
  onBarTap(e: WechatMiniprogram.TouchEvent) {
    const index = e.currentTarget.dataset.index as number
    const item = this.data.monthlyTrend[index]
    if (!item) return

    // 更新选中状态
    const monthlyTrend = this.data.monthlyTrend.map((m, i) => ({
      ...m,
      isSelected: i === index,
    }))

    // 获取该月的详细数据
    const app = getApp<IAppOption>()
    const { currentLedger } = app.globalData
    if (!currentLedger) return

    // 解析月份获取年月
    const monthStr = item.month // 格式如 "1月", "12月"
    const monthNum = parseInt(monthStr.replace('月', ''), 10)
    const now = new Date()
    let year = now.getFullYear()
    
    // 如果当前月份小于选中月份，说明是去年的数据
    if (now.getMonth() + 1 < monthNum) {
      year = year - 1
    }

    // 获取该月记录
    const monthRecords = RecordService.getRecordsByMonth(currentLedger.id, year, monthNum)
    
    // 计算分类统计
    const expenseRecords = monthRecords.filter(r => r.type === 'expense')
    const incomeRecords = monthRecords.filter(r => r.type === 'income')
    
    const expenseStats = RecordService.calculateStatistics(expenseRecords)
    const incomeStats = RecordService.calculateStatistics(incomeRecords)
    
    // 计算饼状图数据
    const expenseCategories = this.calculatePieData(expenseStats.categoryBreakdown)
    const incomeCategories = this.calculatePieData(incomeStats.categoryBreakdown)
    
    // 计算收支占比
    const total = item.income + item.expense
    const incomePercent = total > 0 ? Math.round((item.income / total) * 100) : 0
    const expensePercent = total > 0 ? 100 - incomePercent : 0
    
    const balance = item.income - item.expense
    
    this.setData({
      monthlyTrend,
      showBarDetail: true,
      barDetailData: {
        month: item.month,
        income: formatAmount(item.income),
        expense: formatAmount(item.expense),
        balance: formatAmount(Math.abs(balance)),
        balancePositive: balance >= 0,
        total: formatAmount(total),
        incomePercent,
        expensePercent,
        hasData: monthRecords.length > 0,
        expenseCategories,
        incomeCategories,
      },
    })
  },

  // 计算饼状图数据
  calculatePieData(categoryBreakdown: CategoryBreakdownDisplay[]): CategoryPieData[] {
    let rotation = 0
    return categoryBreakdown.map(c => {
      const data: CategoryPieData = {
        category: c.category,
        name: c.name || c.category,
        amount: c.amount,
        percentage: c.percentage,
        percentDisplay: c.percentage.toFixed(1),
        color: c.color,
        rotation,
      }
      rotation += c.percentage * 3.6 // 转换为角度
      return data
    })
  },

  // 关闭柱状图详情弹窗
  closeBarDetail() {
    const monthlyTrend = this.data.monthlyTrend.map(m => ({
      ...m,
      isSelected: false,
    }))
    this.setData({
      showBarDetail: false,
      monthlyTrend,
    })
  },

  // 分类点击 - 跳转到该分类的明细
  onCategoryTap(e: WechatMiniprogram.TouchEvent) {
    const category = e.currentTarget.dataset.category as string
    const categoryName = e.currentTarget.dataset.name as string
    wx.navigateTo({
      url: `/pages/category-detail/category-detail?category=${category}&name=${encodeURIComponent(categoryName)}&type=${this.data.statsType}`,
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
