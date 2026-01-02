/**
 * 账本状态管理
 */
import { Ledger, UserProfile } from '../models'
import { storageService } from '../services'

@ObservedV2
export class LedgerViewModel {
  @Trace ledgers: Ledger[] = []
  @Trace currentLedger: Ledger | null = null
  @Trace userProfile: UserProfile | null = null
  @Trace isInitialized: boolean = false

  // 初始化
  async initialize(context: Context): Promise<void> {
    await storageService.init(context)

    // 加载账本列表
    this.ledgers = await storageService.getLedgers()

    // 如果没有账本，创建默认账本
    if (this.ledgers.length === 0) {
      const defaultLedger = Ledger.createDefault()
      this.ledgers = [defaultLedger]
      await storageService.saveLedgers(this.ledgers)
    }

    // 加载当前账本
    const currentId = await storageService.getCurrentLedgerId()
    if (currentId) {
      this.currentLedger = this.ledgers.find(l => l.id === currentId) || this.ledgers[0]
    } else {
      this.currentLedger = this.ledgers[0]
      await storageService.setCurrentLedgerId(this.currentLedger.id)
    }

    // 加载用户信息
    this.userProfile = await storageService.getUserProfile()

    this.isInitialized = true
  }

  // 切换账本
  async switchLedger(ledgerId: string): Promise<void> {
    const ledger = this.ledgers.find(l => l.id === ledgerId)
    if (ledger) {
      this.currentLedger = ledger
      await storageService.setCurrentLedgerId(ledgerId)
    }
  }

  // 创建账本
  async createLedger(name: string): Promise<Ledger> {
    const now = new Date().toISOString()
    const ledger = new Ledger({
      id: this.generateId(),
      name,
      createdAt: now,
      updatedAt: now
    })

    this.ledgers.push(ledger)
    await storageService.saveLedgers(this.ledgers)
    return ledger
  }

  // 更新账本
  async updateLedger(id: string, updates: Partial<Ledger>): Promise<void> {
    const index = this.ledgers.findIndex(l => l.id === id)
    if (index !== -1) {
      Object.assign(this.ledgers[index], updates)
      this.ledgers[index].updatedAt = new Date().toISOString()
      await storageService.saveLedgers(this.ledgers)

      if (this.currentLedger?.id === id) {
        this.currentLedger = this.ledgers[index]
      }
    }
  }

  // 删除账本
  async deleteLedger(id: string): Promise<boolean> {
    // 至少保留一个账本
    if (this.ledgers.length <= 1) {
      return false
    }

    const index = this.ledgers.findIndex(l => l.id === id)
    if (index !== -1) {
      this.ledgers.splice(index, 1)
      await storageService.saveLedgers(this.ledgers)

      // 如果删除的是当前账本，切换到第一个
      if (this.currentLedger?.id === id) {
        this.currentLedger = this.ledgers[0]
        await storageService.setCurrentLedgerId(this.currentLedger.id)
      }
      return true
    }
    return false
  }

  // 保存用户信息
  async saveUserProfile(profile: UserProfile): Promise<void> {
    this.userProfile = profile
    await storageService.saveUserProfile(profile)
  }

  // 登出
  async logout(): Promise<void> {
    this.userProfile = null
    await storageService.saveUserProfile(new UserProfile())
  }

  // 是否已登录
  get isLoggedIn(): boolean {
    return !!(this.userProfile?.phone || this.userProfile?.openid)
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
  }
}
