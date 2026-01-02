/**
 * 记账记录模型
 */

export type RecordType = 'income' | 'expense'
export type SyncStatus = 'local' | 'synced'

@Observed
export class AccountRecord {
  id: string = ''
  clientId?: string
  type: RecordType = 'expense'
  amount: number = 0
  category: string = ''
  date: string = '' // YYYY-MM-DD
  note?: string
  ledgerId: string = ''
  createdAt: string = ''
  updatedAt: string = ''
  syncStatus: SyncStatus = 'local'

  constructor(data?: Partial<AccountRecord>) {
    if (data) {
      Object.assign(this, data)
    }
  }

  static fromJson(json: object): AccountRecord {
    const record = new AccountRecord()
    const data = json as Record<string, Object>
    record.id = data['id'] as string || ''
    record.clientId = data['clientId'] as string
    record.type = (data['type'] as RecordType) || 'expense'
    record.amount = Number(data['amount']) || 0
    record.category = data['category'] as string || ''
    record.date = data['date'] as string || ''
    record.note = data['note'] as string
    record.ledgerId = data['ledgerId'] as string || ''
    record.createdAt = data['createdAt'] as string || ''
    record.updatedAt = data['updatedAt'] as string || ''
    record.syncStatus = (data['syncStatus'] as SyncStatus) || 'local'
    return record
  }

  toJson(): object {
    return {
      id: this.id,
      clientId: this.clientId,
      type: this.type,
      amount: this.amount,
      category: this.category,
      date: this.date,
      note: this.note,
      ledgerId: this.ledgerId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      syncStatus: this.syncStatus
    }
  }
}

/**
 * 统计数据
 */
@Observed
export class RecordStatistics {
  totalIncome: number = 0
  totalExpense: number = 0
  balance: number = 0
  recordCount: number = 0

  constructor(data?: Partial<RecordStatistics>) {
    if (data) {
      Object.assign(this, data)
      this.balance = this.totalIncome - this.totalExpense
    }
  }
}

/**
 * 分类统计
 */
@Observed
export class CategoryBreakdown {
  category: string = ''
  amount: number = 0
  count: number = 0
  percentage: number = 0

  constructor(data?: Partial<CategoryBreakdown>) {
    if (data) {
      Object.assign(this, data)
    }
  }
}

/**
 * 月度趋势
 */
@Observed
export class MonthlyTrend {
  month: string = ''
  income: number = 0
  expense: number = 0

  constructor(data?: Partial<MonthlyTrend>) {
    if (data) {
      Object.assign(this, data)
    }
  }
}
