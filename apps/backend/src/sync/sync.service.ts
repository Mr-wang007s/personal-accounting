import { Injectable, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { RedisService } from '../redis/redis.service'
import { RecordsService } from '../records/records.service'
import { SyncPushDto, SyncRecordDto } from './dto/sync-push.dto'
import { RecordType } from '@prisma/client'

export interface SyncResult {
  serverVersion: number
  created: number
  updated: number
  deleted: number
  conflicts: SyncConflict[]
}

export interface SyncConflict {
  clientId: string
  serverId: string
  type: 'create' | 'update' | 'delete'
  reason: string
}

@Injectable()
export class SyncService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private recordsService: RecordsService,
  ) {}

  // 获取同步状态
  async getSyncStatus(userId: string, deviceId: string) {
    const syncVersion = await this.prisma.syncVersion.findUnique({
      where: {
        userId_deviceId: { userId, deviceId },
      },
    })

    // 获取服务器最新版本
    const latestRecord = await this.prisma.record.findFirst({
      where: { userId },
      orderBy: { syncVersion: 'desc' },
      select: { syncVersion: true },
    })

    return {
      deviceId,
      lastSyncAt: syncVersion?.lastSyncAt || null,
      clientVersion: syncVersion?.serverVersion || 0,
      serverVersion: latestRecord?.syncVersion || 0,
      needsSync: (latestRecord?.syncVersion || 0) > (syncVersion?.serverVersion || 0),
    }
  }

  // 拉取增量数据
  async pull(userId: string, deviceId: string, lastSyncVersion: number) {
    // 获取自上次同步以来的所有变更
    const changes = await this.prisma.record.findMany({
      where: {
        userId,
        syncVersion: { gt: lastSyncVersion },
      },
      orderBy: { syncVersion: 'asc' },
    })

    // 获取当前服务器版本
    const latestRecord = await this.prisma.record.findFirst({
      where: { userId },
      orderBy: { syncVersion: 'desc' },
      select: { syncVersion: true },
    })

    const serverVersion = latestRecord?.syncVersion || 0

    // 更新设备同步版本
    await this.prisma.syncVersion.upsert({
      where: {
        userId_deviceId: { userId, deviceId },
      },
      create: {
        userId,
        deviceId,
        serverVersion,
        lastSyncAt: new Date(),
      },
      update: {
        serverVersion,
        lastSyncAt: new Date(),
      },
    })

    return {
      serverVersion,
      changes: changes.map((record) => ({
        id: record.id,
        clientId: record.clientId,
        type: record.type,
        amount: Number(record.amount),
        category: record.category,
        date: record.date.toISOString().split('T')[0],
        note: record.note,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
        deletedAt: record.deletedAt?.toISOString() || null,
        syncVersion: record.syncVersion,
      })),
    }
  }

  // 推送本地变更
  async push(
    userId: string,
    deviceId: string,
    dto: SyncPushDto,
  ): Promise<SyncResult> {
    const conflicts: SyncConflict[] = []
    let created = 0
    let updated = 0
    let deleted = 0

    // 使用事务处理所有变更
    await this.prisma.$transaction(async (tx) => {
      // 处理新建记录
      for (const record of dto.created || []) {
        try {
          // 检查是否已存在（通过 clientId）
          const existing = await tx.record.findFirst({
            where: { userId, clientId: record.clientId },
          })

          if (existing) {
            conflicts.push({
              clientId: record.clientId || '',
              serverId: existing.id,
              type: 'create',
              reason: 'Record already exists',
            })
            continue
          }

          await tx.record.create({
            data: {
              userId,
              type: record.type as RecordType,
              amount: record.amount || 0,
              category: record.category || '',
              date: new Date(record.date || new Date()),
              note: record.note,
              clientId: record.clientId,
            },
          })
          created++
        } catch {
          conflicts.push({
            clientId: record.clientId || '',
            serverId: '',
            type: 'create',
            reason: 'Failed to create record',
          })
        }
      }

      // 处理更新记录
      for (const record of dto.updated || []) {
        try {
          const existing = await tx.record.findFirst({
            where: { id: record.id, userId },
          })

          if (!existing) {
            conflicts.push({
              clientId: record.clientId || '',
              serverId: record.id || '',
              type: 'update',
              reason: 'Record not found',
            })
            continue
          }

          // 检查版本冲突
          if (
            record.syncVersion !== undefined &&
            existing.syncVersion > record.syncVersion
          ) {
            conflicts.push({
              clientId: record.clientId || '',
              serverId: record.id || '',
              type: 'update',
              reason: 'Version conflict - server has newer version',
            })
            continue
          }

          await tx.record.update({
            where: { id: record.id },
            data: {
              type: record.type as RecordType | undefined,
              amount: record.amount,
              category: record.category,
              date: record.date ? new Date(record.date) : undefined,
              note: record.note,
              syncVersion: { increment: 1 },
            },
          })
          updated++
        } catch {
          conflicts.push({
            clientId: record.clientId || '',
            serverId: record.id || '',
            type: 'update',
            reason: 'Failed to update record',
          })
        }
      }

      // 处理删除记录
      for (const id of dto.deleted || []) {
        try {
          const existing = await tx.record.findFirst({
            where: { id, userId, deletedAt: null },
          })

          if (!existing) {
            continue // 已删除或不存在，跳过
          }

          await tx.record.update({
            where: { id },
            data: {
              deletedAt: new Date(),
              syncVersion: { increment: 1 },
            },
          })
          deleted++
        } catch {
          conflicts.push({
            clientId: '',
            serverId: id,
            type: 'delete',
            reason: 'Failed to delete record',
          })
        }
      }
    })

    // 获取最新服务器版本
    const latestRecord = await this.prisma.record.findFirst({
      where: { userId },
      orderBy: { syncVersion: 'desc' },
      select: { syncVersion: true },
    })

    const serverVersion = latestRecord?.syncVersion || 0

    // 更新设备同步版本
    await this.prisma.syncVersion.upsert({
      where: {
        userId_deviceId: { userId, deviceId },
      },
      create: {
        userId,
        deviceId,
        serverVersion,
        lastSyncAt: new Date(),
      },
      update: {
        serverVersion,
        lastSyncAt: new Date(),
      },
    })

    // 清除缓存
    await this.redis.del(RedisService.keys.userRecords(userId))

    return {
      serverVersion,
      created,
      updated,
      deleted,
      conflicts,
    }
  }

  // 全量同步（用于首次同步或数据恢复）
  async fullSync(userId: string, deviceId: string) {
    const records = await this.prisma.record.findMany({
      where: { userId, deletedAt: null },
      orderBy: { date: 'desc' },
    })

    const latestRecord = await this.prisma.record.findFirst({
      where: { userId },
      orderBy: { syncVersion: 'desc' },
      select: { syncVersion: true },
    })

    const serverVersion = latestRecord?.syncVersion || 0

    // 更新设备同步版本
    await this.prisma.syncVersion.upsert({
      where: {
        userId_deviceId: { userId, deviceId },
      },
      create: {
        userId,
        deviceId,
        serverVersion,
        lastSyncAt: new Date(),
      },
      update: {
        serverVersion,
        lastSyncAt: new Date(),
      },
    })

    return {
      serverVersion,
      records: records.map((record) => ({
        id: record.id,
        clientId: record.clientId,
        type: record.type,
        amount: Number(record.amount),
        category: record.category,
        date: record.date.toISOString().split('T')[0],
        note: record.note,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
        syncVersion: record.syncVersion,
      })),
    }
  }
}
