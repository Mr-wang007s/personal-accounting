import { Injectable, Logger, Inject } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CacheService } from '../cache/cache.service'
import { BackupDto, DeleteCloudRecordsDto } from './dto/sync-push.dto'
import { RecordType } from '@prisma/client'

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

// 备份结果
export interface BackupResult {
  success: boolean
  uploaded: number
  records: Array<{
    clientId: string
    serverId: string
  }>
}

// 恢复结果
export interface RestoreResult {
  success: boolean
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
   * 备份：将本地记录上传到云端
   * - 如果 clientId 已存在，更新云端记录
   * - 如果 clientId 不存在，创建新记录
   */
  async backup(userId: string, dto: BackupDto): Promise<BackupResult> {
    this.logger.log(`[Backup] userId=${userId}, records=${dto.records.length}`)
    
    const results: Array<{ clientId: string; serverId: string }> = []
    let uploaded = 0

    for (const record of dto.records) {
      try {
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
        this.logger.error(`[Backup] 失败: clientId=${record.clientId}`, error)
      }
    }

    // 清除缓存
    this.cache.del(CacheService.keys.userRecords(userId))

    return {
      success: true,
      uploaded,
      records: results,
    }
  }

  /**
   * 恢复：从云端下载所有记录到本地
   */
  async restore(userId: string): Promise<RestoreResult> {
    this.logger.log(`[Restore] userId=${userId}`)

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

    this.logger.log(`[Restore] 返回 ${cloudRecords.length} 条记录`)

    return {
      success: true,
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
