/**
 * 本地存储服务
 */
import { preferences } from '@kit.ArkData'
import { AccountRecord, Ledger, UserProfile } from '../models'

// 存储键
const STORAGE_KEYS = {
  RECORDS: 'pa_records',
  LEDGERS: 'pa_ledgers',
  CURRENT_LEDGER: 'pa_current_ledger',
  USER_PROFILE: 'pa_user_profile',
  SYNC_META: 'pa_sync_meta',
  AUTO_SYNC: 'pa_auto_sync'
}

class StorageService {
  private store: preferences.Preferences | null = null
  private context: Context | null = null

  async init(context: Context): Promise<void> {
    this.context = context
    this.store = await preferences.getPreferences(context, 'personal_accounting')
  }

  // ========== 记录相关 ==========

  async getRecords(): Promise<AccountRecord[]> {
    if (!this.store) return []
    const data = await this.store.get(STORAGE_KEYS.RECORDS, '[]')
    try {
      const jsonArray = JSON.parse(data as string) as object[]
      return jsonArray.map(item => AccountRecord.fromJson(item))
    } catch {
      return []
    }
  }

  async saveRecords(records: AccountRecord[]): Promise<void> {
    if (!this.store) return
    const data = JSON.stringify(records.map(r => r.toJson()))
    await this.store.put(STORAGE_KEYS.RECORDS, data)
    await this.store.flush()
  }

  async addRecord(record: AccountRecord): Promise<void> {
    const records = await this.getRecords()
    records.unshift(record)
    await this.saveRecords(records)
  }

  async updateRecord(id: string, updates: Partial<AccountRecord>): Promise<void> {
    const records = await this.getRecords()
    const index = records.findIndex(r => r.id === id)
    if (index !== -1) {
      Object.assign(records[index], updates)
      records[index].updatedAt = new Date().toISOString()
      await this.saveRecords(records)
    }
  }

  async deleteRecord(id: string): Promise<void> {
    const records = await this.getRecords()
    const filtered = records.filter(r => r.id !== id)
    await this.saveRecords(filtered)
  }

  // ========== 账本相关 ==========

  async getLedgers(): Promise<Ledger[]> {
    if (!this.store) return []
    const data = await this.store.get(STORAGE_KEYS.LEDGERS, '[]')
    try {
      const jsonArray = JSON.parse(data as string) as object[]
      return jsonArray.map(item => Ledger.fromJson(item))
    } catch {
      return []
    }
  }

  async saveLedgers(ledgers: Ledger[]): Promise<void> {
    if (!this.store) return
    const data = JSON.stringify(ledgers.map(l => l.toJson()))
    await this.store.put(STORAGE_KEYS.LEDGERS, data)
    await this.store.flush()
  }

  async getCurrentLedgerId(): Promise<string | null> {
    if (!this.store) return null
    const id = await this.store.get(STORAGE_KEYS.CURRENT_LEDGER, '')
    return (id as string) || null
  }

  async setCurrentLedgerId(id: string): Promise<void> {
    if (!this.store) return
    await this.store.put(STORAGE_KEYS.CURRENT_LEDGER, id)
    await this.store.flush()
  }

  // ========== 用户相关 ==========

  async getUserProfile(): Promise<UserProfile | null> {
    if (!this.store) return null
    const data = await this.store.get(STORAGE_KEYS.USER_PROFILE, '')
    if (!data) return null
    try {
      return new UserProfile(JSON.parse(data as string))
    } catch {
      return null
    }
  }

  async saveUserProfile(profile: UserProfile): Promise<void> {
    if (!this.store) return
    await this.store.put(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile))
    await this.store.flush()
  }

  // ========== 同步相关 ==========

  async getAutoSync(): Promise<boolean> {
    if (!this.store) return false
    return await this.store.get(STORAGE_KEYS.AUTO_SYNC, false) as boolean
  }

  async setAutoSync(enabled: boolean): Promise<void> {
    if (!this.store) return
    await this.store.put(STORAGE_KEYS.AUTO_SYNC, enabled)
    await this.store.flush()
  }

  // ========== 清理 ==========

  async clear(): Promise<void> {
    if (!this.store) return
    await this.store.clear()
    await this.store.flush()
  }
}

export const storageService = new StorageService()
