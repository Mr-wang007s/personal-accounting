/**
 * 记录状态管理
 */
import { AccountRecord, RecordStatistics, CategoryBreakdown, MonthlyTrend, RecordType } from '../models'
import { recordService, storageService } from '../services'

@ObservedV2
export class RecordsViewModel {
  @Trace records: AccountRecord[] = []
  @Trace statistics: RecordStatistics = new RecordStatistics()
  @Trace categoryStats: CategoryBreakdown[] = []
  @Trace monthlyTrend: MonthlyTrend[] = []
  @Trace isLoading: boolean = false
  @Trace currentMonth: string = ''
  @Trace filterType: RecordType | 'all' = 'all'

  private currentLedgerId: string = ''

  constructor() {
    const now = new Date()
    this.currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`
  }

  setLedgerId(ledgerId: string): void {
    this.currentLedgerId = ledgerId
  }

  // 加载记录
  async loadRecords(): Promise<void> {
    if (!this.currentLedgerId) return

    this.isLoading = true
    try {
      const startDate = `${this.currentMonth}-01`
      const endDate = this.getMonthEndDate(this.currentMonth)

      const options: { startDate: string, endDate: string, type?: RecordType } = {
        startDate,
        endDate
      }

      if (this.filterType !== 'all') {
        options.type = this.filterType
      }

      this.records = await recordService.getRecords(this.currentLedgerId, options)
    } finally {
      this.isLoading = false
    }
  }

  // 加载统计
  async loadStatistics(): Promise<void> {
    if (!this.currentLedgerId) return

    const startDate = `${this.currentMonth}-01`
    const endDate = this.getMonthEndDate(this.currentMonth)

    this.statistics = await recordService.getStatistics(this.currentLedgerId, startDate, endDate)
  }

  // 加载分类统计
  async loadCategoryStats(type: RecordType = 'expense'): Promise<void> {
    if (!this.currentLedgerId) return

    const startDate = `${this.currentMonth}-01`
    const endDate = this.getMonthEndDate(this.currentMonth)

    this.categoryStats = await recordService.getCategoryStats(this.currentLedgerId, type, startDate, endDate)
  }

  // 加载月度趋势
  async loadMonthlyTrend(): Promise<void> {
    if (!this.currentLedgerId) return

    const year = parseInt(this.currentMonth.split('-')[0])
    this.monthlyTrend = await recordService.getMonthlyTrend(this.currentLedgerId, year)
  }

  // 添加记录
  async addRecord(data: {
    type: RecordType
    amount: number
    category: string
    date: string
    note?: string
  }): Promise<AccountRecord> {
    const record = await recordService.createRecord({
      ...data,
      ledgerId: this.currentLedgerId
    })

    // 刷新数据
    await this.loadRecords()
    await this.loadStatistics()

    return record
  }

  // 更新记录
  async updateRecord(id: string, updates: Partial<AccountRecord>): Promise<void> {
    await recordService.updateRecord(id, updates)
    await this.loadRecords()
    await this.loadStatistics()
  }

  // 删除记录
  async deleteRecord(id: string): Promise<void> {
    await recordService.deleteRecord(id)
    await this.loadRecords()
    await this.loadStatistics()
  }

  // 切换月份
  async switchMonth(month: string): Promise<void> {
    this.currentMonth = month
    await this.loadRecords()
    await this.loadStatistics()
  }

  // 上个月
  async previousMonth(): Promise<void> {
    const [year, month] = this.currentMonth.split('-').map(Number)
    let newYear = year
    let newMonth = month - 1
    if (newMonth < 1) {
      newMonth = 12
      newYear -= 1
    }
    await this.switchMonth(`${newYear}-${newMonth.toString().padStart(2, '0')}`)
  }

  // 下个月
  async nextMonth(): Promise<void> {
    const [year, month] = this.currentMonth.split('-').map(Number)
    let newYear = year
    let newMonth = month + 1
    if (newMonth > 12) {
      newMonth = 1
      newYear += 1
    }
    await this.switchMonth(`${newYear}-${newMonth.toString().padStart(2, '0')}`)
  }

  // 设置筛选类型
  async setFilterType(type: RecordType | 'all'): Promise<void> {
    this.filterType = type
    await this.loadRecords()
  }

  // 按日期分组
  get groupedRecords(): Map<string, AccountRecord[]> {
    return recordService.groupRecordsByDate(this.records)
  }

  // 获取月份结束日期
  private getMonthEndDate(month: string): string {
    const [year, m] = month.split('-').map(Number)
    const lastDay = new Date(year, m, 0).getDate()
    return `${month}-${lastDay.toString().padStart(2, '0')}`
  }

  // 格式化月份显示
  get currentMonthDisplay(): string {
    const [year, month] = this.currentMonth.split('-')
    return `${year}年${parseInt(month)}月`
  }
}
