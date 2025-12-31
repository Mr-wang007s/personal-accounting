/**
 * 记账表单页
 */
import type { Category, RecordType } from '../../shared/types'
import { getCategoriesByType, CATEGORY_COLORS } from '../../shared/constants'
import { formatDate, getToday } from '../../shared/utils'
import { RecordService } from '../../services/record'
import { StorageService } from '../../services/storage'

interface CategoryDisplay extends Category {
  color: string
}

Page({
  data: {
    type: 'expense' as RecordType,
    amount: '',
    selectedCategory: '',
    date: getToday(),
    dateDisplay: '',
    note: '',
    categories: [] as CategoryDisplay[],
    isEdit: false,
    editId: '',
    canSave: false,
    amountFocus: true,
  },

  onLoad(options) {
    // 设置类型
    const type = (options.type as RecordType) || 'expense'

    // 检查是否是编辑模式
    const editId = options.id

    this.setData({
      type,
      isEdit: !!editId,
      editId: editId || '',
    })

    this.loadCategories(type)
    this.updateDateDisplay()

    // 如果是编辑模式，加载记录数据
    if (editId) {
      this.loadRecord(editId)
    }

    // 设置导航栏标题
    wx.setNavigationBarTitle({
      title: editId ? '编辑记录' : (type === 'income' ? '记收入' : '记支出')
    })
  },

  // 加载分类
  loadCategories(type: RecordType) {
    const categories = getCategoriesByType(type).map(cat => ({
      ...cat,
      color: CATEGORY_COLORS[cat.id] || '#94A3B8',
    }))

    this.setData({
      categories,
      selectedCategory: categories[0]?.id || '',
    })

    this.checkCanSave()
  },

  // 加载记录（编辑模式）
  loadRecord(id: string) {
    const records = StorageService.getRecords()
    const record = records.find(r => r.id === id)

    if (record) {
      this.setData({
        type: record.type,
        amount: String(record.amount),
        selectedCategory: record.category,
        date: record.date,
        note: record.note || '',
      })

      this.loadCategories(record.type)
      this.setData({ selectedCategory: record.category })
      this.updateDateDisplay()
      this.checkCanSave()
    }
  },

  // 更新日期显示
  updateDateDisplay() {
    const date = new Date(this.data.date)
    const today = getToday()
    const yesterday = formatDate(new Date(Date.now() - 86400000))

    let display = ''
    if (this.data.date === today) {
      display = '今天'
    } else if (this.data.date === yesterday) {
      display = '昨天'
    } else {
      const month = date.getMonth() + 1
      const day = date.getDate()
      display = `${month}月${day}日`
    }

    this.setData({ dateDisplay: display })
  },

  // 切换类型
  switchType(e: WechatMiniprogram.TouchEvent) {
    const type = e.currentTarget.dataset.type as RecordType
    if (type !== this.data.type) {
      this.setData({ type })
      this.loadCategories(type)

      wx.setNavigationBarTitle({
        title: this.data.isEdit ? '编辑记录' : (type === 'income' ? '记收入' : '记支出')
      })
    }
  },

  // 金额输入
  onAmountInput(e: WechatMiniprogram.Input) {
    let value = e.detail.value

    // 限制小数点后两位
    if (value.includes('.')) {
      const parts = value.split('.')
      if (parts[1] && parts[1].length > 2) {
        value = `${parts[0]}.${parts[1].slice(0, 2)}`
      }
    }

    this.setData({ amount: value })
    this.checkCanSave()
  },

  // 选择分类
  selectCategory(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id
    this.setData({ selectedCategory: id })
    this.checkCanSave()
  },

  // 日期变化
  onDateChange(e: WechatMiniprogram.PickerChange) {
    this.setData({ date: e.detail.value as string })
    this.updateDateDisplay()
  },

  // 备注输入
  onNoteInput(e: WechatMiniprogram.Input) {
    this.setData({ note: e.detail.value })
  },

  // 检查是否可以保存
  checkCanSave() {
    const { amount, selectedCategory } = this.data
    const numAmount = parseFloat(amount)
    const canSave = !isNaN(numAmount) && numAmount > 0 && !!selectedCategory
    this.setData({ canSave })
  },

  // 保存记录
  saveRecord() {
    const { type, amount, selectedCategory, date, note, isEdit, editId } = this.data
    const numAmount = parseFloat(amount)

    if (isNaN(numAmount) || numAmount <= 0) {
      wx.showToast({ title: '请输入金额', icon: 'none' })
      return
    }

    if (!selectedCategory) {
      wx.showToast({ title: '请选择分类', icon: 'none' })
      return
    }

    const app = getApp<IAppOption>()
    const ledgerId = app.globalData.currentLedger?.id

    if (!ledgerId) {
      wx.showToast({ title: '请先选择账本', icon: 'none' })
      return
    }

    if (isEdit && editId) {
      // 更新记录
      RecordService.updateRecord(editId, {
        type,
        amount: numAmount,
        category: selectedCategory,
        date,
        note: note || undefined,
      })
      wx.showToast({ title: '修改成功', icon: 'success' })
    } else {
      // 新增记录
      RecordService.addRecord({
        type,
        amount: numAmount,
        category: selectedCategory,
        date,
        note: note || undefined,
        ledgerId,
      })
      wx.showToast({ title: '保存成功', icon: 'success' })
    }

    // 刷新全局数据
    app.refreshData()

    // 返回上一页
    setTimeout(() => {
      wx.navigateBack()
    }, 500)
  },

  // 删除记录
  deleteRecord() {
    const { editId } = this.data

    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除这条记录吗？',
      confirmColor: '#EF4444',
      success: (res) => {
        if (res.confirm) {
          RecordService.deleteRecord(editId)

          const app = getApp<IAppOption>()
          app.refreshData()

          wx.showToast({ title: '已删除', icon: 'success' })

          setTimeout(() => {
            wx.navigateBack()
          }, 500)
        }
      }
    })
  },
})
