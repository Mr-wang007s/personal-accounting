/**
 * 分类明细页
 */
import type { Record } from '../../shared/types'
import { getCategoryById, CATEGORY_COLORS } from '../../shared/constants'
import { formatAmount } from '../../shared/utils'
import { RecordService } from '../../services/record'

interface RecordDisplay extends Record {
  categoryName: string
  categoryIcon: string
  categoryColor: string
  amountDisplay: string
  dateDisplay: string
}

Page({
  data: {
    category: '',
    categoryName: '',
    categoryIcon: '',
    categoryColor: '',
    type: 'expense' as 'expense' | 'income',
    
    totalAmount: '0.00',
    recordCount: 0,
    records: [] as RecordDisplay[],
  },

  onLoad(options) {
    const { category, name, type } = options
    const categoryInfo = getCategoryById(category || '')
    
    this.setData({
      category: category || '',
      categoryName: name ? decodeURIComponent(name) : categoryInfo?.name || '未知分类',
      categoryIcon: categoryInfo?.icon || 'other',
      categoryColor: CATEGORY_COLORS[category || ''] || '#94A3B8',
      type: (type as 'expense' | 'income') || 'expense',
    })

    wx.setNavigationBarTitle({
      title: this.data.categoryName,
    })
  },

  onShow() {
    this.loadData()
  },

  loadData() {
    const app = getApp<IAppOption>()
    const { currentLedger } = app.globalData
    if (!currentLedger) return

    const { category, type } = this.data
    const allRecords = RecordService.getRecordsByLedger(currentLedger.id)
    
    // 过滤当前分类的记录
    const filteredRecords = allRecords.filter(r => 
      r.category === category && r.type === type
    )

    // 计算总金额
    const totalAmount = filteredRecords.reduce((sum, r) => sum + r.amount, 0)

    // 转换为显示格式，按日期倒序
    const records: RecordDisplay[] = filteredRecords
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(r => {
        const categoryInfo = getCategoryById(r.category)
        return {
          ...r,
          categoryName: categoryInfo?.name || '其他',
          categoryIcon: categoryInfo?.icon || 'other',
          categoryColor: CATEGORY_COLORS[r.category] || '#94A3B8',
          amountDisplay: formatAmount(r.amount),
          dateDisplay: this.formatDate(r.date),
        }
      })

    this.setData({
      totalAmount: formatAmount(totalAmount),
      recordCount: records.length,
      records,
    })
  },

  formatDate(dateStr: string): string {
    const date = new Date(dateStr)
    const month = date.getMonth() + 1
    const day = date.getDate()
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const weekDay = weekDays[date.getDay()]
    return `${month}月${day}日 ${weekDay}`
  },

  // 编辑记录
  editRecord(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/record/record?id=${id}`,
    })
  },

  // 返回
  goBack() {
    wx.navigateBack()
  },
})
