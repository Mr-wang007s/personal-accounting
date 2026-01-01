import { Injectable, Logger, Inject } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CacheService } from '../cache/cache.service'
import { BackupDto, BackupLedgersDto, DeleteCloudRecordsDto } from './dto/sync-push.dto'
import { RecordType } from '@prisma/client'

// 云端账本响应
export interface CloudLedger {
  serverId: string
  clientId: string
  name: string
  icon?: string
  color?: string
  createdAt: string
  updatedAt: string
}

// 云端记录响应
export interface CloudRecord {
  serverId: string
  clientId: string
  type: 'income' | 'expense'
  amount: number
  category: string
  date: string
  note?: string
  createdAt: string
  updatedAt: string
  ledgerId: string
}

// 账本备份结果
export interface BackupLedgersResult {
  success: boolean
  uploaded: number
  ledgers: Array<{
    clientId: string
    serverId: string
  }>
  errors?: Array<{
    clientId: string
    error: string
  }>
}

// 备份结果
export interface BackupResult {
  success: boolean
  uploaded: number
  records: Array<{
    clientId: string
    serverId: string
  }>
  errors?: Array<{
    clientId: string
    error: string
  }>
}

// 恢复结果
export interface RestoreResult {
  success: boolean
  ledgers: CloudLedger[]
  records: CloudRecord[]
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name)
  
  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
    @Inject(CacheService) private cache: CacheService,
  ) {}

  /**
   * 备份账本：将本地账本上传到云端
   * - 如果 clientId 已存在，更新云端账本
   * - 如果 clientId 不存在，创建新账本
   */
  async backupLedgers(userId: string, dto: BackupLedgersDto): Promise<BackupLedgersResult> {
    this.logger.log(`[BackupLedgers] userId=${userId}, ledgers=${dto.ledgers.length}`)
    
    const results: Array<{ clientId: string; serverId: string }> = []
    const errors: Array<{ clientId: string; error: string }> = []
    let uploaded = 0

    for (const ledger of dto.ledgers) {
      try {
        // 检查是否已存在（按 clientId 查找）
        const existing = await this.prisma.ledger.findFirst({
          where: { userId, clientId: ledger.clientId, deletedAt: null },
        })

        if (existing) {
          // 更新已有账本
          const updated = await this.prisma.ledger.update({
            where: { id: existing.id },
            data: {
              name: ledger.name,
              icon: ledger.icon,
              color: ledger.color,
            },
          })
          results.push({ clientId: ledger.clientId, serverId: updated.id })
          this.logger.log(`[BackupLedgers] 更新: clientId=${ledger.clientId}, serverId=${updated.id}`)
        } else {
          // 创建新账本，使用 clientId 作为 id（保持一致性）
          const created = await this.prisma.ledger.create({
            data: {
              id: ledger.clientId, // 使用 clientId 作为 serverId
              userId,
              name: ledger.name,
              icon: ledger.icon,
              color: ledger.color,
              clientId: ledger.clientId,
              createdAt: new Date(ledger.createdAt),
            },
          })
          results.push({ clientId: ledger.clientId, serverId: created.id })
          this.logger.log(`[BackupLedgers] 创建: clientId=${ledger.clientId}, serverId=${created.id}`)
        }
        uploaded++
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        this.logger.error(`[BackupLedgers] 失败: clientId=${ledger.clientId}, error=${errorMsg}`)
        errors.push({ clientId: ledger.clientId, error: errorMsg })
      }
    }

    return {
      success: errors.length === 0,
      uploaded,
      ledgers: results,
      errors: errors.length > 0 ? errors : undefined,
    }
  }

  /**
   * 备份：将本地记录上传到云端
   * - 如果 clientId 已存在，更新云端记录
   * - 如果 clientId 不存在，创建新记录
   */
  async backup(userId: string, dto: BackupDto): Promise<BackupResult> {
    this.logger.log(`[Backup] userId=${userId}, records=${dto.records.length}`)
    
    const results: Array<{ clientId: string; serverId: string }> = []
    const errors: Array<{ clientId: string; error: string }> = []
    let uploaded = 0

    for (const record of dto.records) {
      try {
        // 检查账本是否存在
        const ledger = await this.prisma.ledger.findFirst({
          where: { id: record.ledgerId, userId, deletedAt: null },
        })
        
        if (!ledger) {
          const errorMsg = `账本不存在: ledgerId=${record.ledgerId}`
          this.logger.error(`[Backup] ${errorMsg}`)
          errors.push({ clientId: record.clientId, error: errorMsg })
          continue
        }

        // 检查是否已存在
        const existing = await this.prisma.record.findFirst({
          where: { userId, clientId: record.clientId, deletedAt: null },
        })

        if (existing) {
          // 更新已有记录
          const updated = await this.prisma.record.update({
            where: { id: existing.id },
            data: {
              type: record.type as RecordType,
              amount: record.amount,
              category: record.category,
              date: new Date(record.date),
              note: record.note,
              ledgerId: record.ledgerId,
            },
          })
          results.push({ clientId: record.clientId, serverId: updated.id })
          this.logger.log(`[Backup] 更新: clientId=${record.clientId}, serverId=${updated.id}`)
        } else {
          // 创建新记录
          const created = await this.prisma.record.create({
            data: {
              userId,
              type: record.type as RecordType,
              amount: record.amount,
              category: record.category,
              date: new Date(record.date),
              note: record.note,
              clientId: record.clientId,
              ledgerId: record.ledgerId,
              createdAt: new Date(record.createdAt),
            },
          })
          results.push({ clientId: record.clientId, serverId: created.id })
          this.logger.log(`[Backup] 创建: clientId=${record.clientId}, serverId=${created.id}`)
        }
        uploaded++
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        this.logger.error(`[Backup] 失败: clientId=${record.clientId}, error=${errorMsg}`)
        errors.push({ clientId: record.clientId, error: errorMsg })
      }
    }

    // 清除缓存
    this.cache.del(CacheService.keys.userRecords(userId))

    return {
      success: errors.length === 0,
      uploaded,
      records: results,
      errors: errors.length > 0 ? errors : undefined,
    } as BackupResult
  }

  /**
   * 恢复：从云端下载所有账本和记录到本地
   */
  async restore(userId: string): Promise<RestoreResult> {
    this.logger.log(`[Restore] userId=${userId}`)

    // 获取账本
    const ledgers = await this.prisma.ledger.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    })

    const cloudLedgers: CloudLedger[] = ledgers.map((l) => ({
      serverId: l.id,
      clientId: l.clientId || l.id,
      name: l.name,
      icon: l.icon || undefined,
      color: l.color || undefined,
      createdAt: l.createdAt.toISOString(),
      updatedAt: l.updatedAt.toISOString(),
    }))

    // 获取记录
    const records = await this.prisma.record.findMany({
      where: { userId, deletedAt: null },
      orderBy: { date: 'desc' },
    })

    const cloudRecords: CloudRecord[] = records.map((r) => ({
      serverId: r.id,
      clientId: r.clientId || r.id,
      type: r.type as 'income' | 'expense',
      amount: Number(r.amount),
      category: r.category,
      date: r.date.toISOString().split('T')[0],
      note: r.note || undefined,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      ledgerId: r.ledgerId,
    }))

    this.logger.log(`[Restore] 返回 ${cloudLedgers.length} 个账本, ${cloudRecords.length} 条记录`)

    return {
      success: true,
      ledgers: cloudLedgers,
      records: cloudRecords,
    }
  }

  /**
   * 删除云端记录
   */
  async deleteCloudRecords(userId: string, dto: DeleteCloudRecordsDto): Promise<{ deleted: number }> {
    this.logger.log(`[DeleteCloud] userId=${userId}, ids=${dto.serverIds.length}`)

    let deleted = 0
    for (const serverId of dto.serverIds) {
      try {
        await this.prisma.record.update({
          where: { id: serverId, userId },
          data: { deletedAt: new Date() },
        })
        deleted++
      } catch (error) {
        this.logger.error(`[DeleteCloud] 删除失败: serverId=${serverId}`, error)
      }
    }

    // 清除缓存
    this.cache.del(CacheService.keys.userRecords(userId))

    return { deleted }
  }
}
