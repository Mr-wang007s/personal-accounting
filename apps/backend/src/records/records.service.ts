import { Injectable, NotFoundException, Inject, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { Prisma } from '@prisma/client'
import { CreateRecordDto } from './dto/create-record.dto'
import { UpdateRecordDto } from './dto/update-record.dto'
import { QueryRecordsDto } from './dto/query-records.dto'

/**
 * 云端记录响应格式
 */
export interface CloudRecord {
  id: string
  type: 'income' | 'expense'
  amount: number
  category: string
  date: string
  note?: string
  createdAt: string
  updatedAt: string
  ledgerId: string
}

// 数据库记录类型
interface DbRecord {
  id: string
  type: string
  amount: Prisma.Decimal
  category: string
  date: Date
  note: string | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
  clientId: string | null
  userId: string
  ledgerId: string
}

@Injectable()
export class RecordsService {
  private readonly logger = new Logger(RecordsService.name)

  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  /**
   * 获取记录列表
   */
  async findAll(userId: string, query: QueryRecordsDto): Promise<CloudRecord[]> {
    const where: Prisma.RecordWhereInput = {
      userId,
      deletedAt: null,
    }

    // 账本筛选
    if (query.ledgerId) {
      where.ledgerId = query.ledgerId
    }

    // 类型筛选
    if (query.type) {
      where.type = query.type
    }

    // 分类筛选
    if (query.category) {
      where.category = query.category
    }

    // 日期范围筛选
    if (query.startDate || query.endDate) {
      where.date = {}
      if (query.startDate) {
        where.date.gte = new Date(query.startDate)
      }
      if (query.endDate) {
        where.date.lte = new Date(query.endDate)
      }
    }

    const records = await this.prisma.record.findMany({
      where,
      orderBy: { date: 'desc' },
    })

    return records.map((r) => this.toCloudRecord(r as DbRecord))
  }

  /**
   * 创建记录（幂等：已存在则更新）
   */
  async create(userId: string, dto: CreateRecordDto): Promise<CloudRecord> {
    this.logger.log(`[create] userId=${userId}, ledgerId=${dto.ledgerId}`)

    // 如果有 clientId，检查是否已存在
    if (dto.clientId) {
      const existing = await this.prisma.record.findFirst({
        where: { userId, clientId: dto.clientId, deletedAt: null },
      })

      if (existing) {
        // 已存在则更新
        const updated = await this.prisma.record.update({
          where: { id: existing.id },
          data: {
            type: dto.type,
            amount: dto.amount,
            category: dto.category,
            date: new Date(dto.date),
            note: dto.note,
          },
        })
        this.logger.log(`[create] 已存在，更新: id=${updated.id}`)
        return this.toCloudRecord(updated as DbRecord)
      }
    }

    // 创建新记录
    const record = await this.prisma.record.create({
      data: {
        userId,
        type: dto.type,
        amount: dto.amount,
        category: dto.category,
        date: new Date(dto.date),
        note: dto.note,
        clientId: dto.clientId,
        ledgerId: dto.ledgerId,
      },
    })

    this.logger.log(`[create] 创建成功: id=${record.id}`)
    return this.toCloudRecord(record as DbRecord)
  }

  /**
   * 获取单条记录
   */
  async findOne(userId: string, id: string): Promise<CloudRecord> {
    const record = await this.findRecordByIdOrClientId(userId, id)
    return this.toCloudRecord(record)
  }

  /**
   * 更新记录
   */
  async update(userId: string, id: string, dto: UpdateRecordDto): Promise<CloudRecord> {
    this.logger.log(`[update] userId=${userId}, id=${id}`)

    const existing = await this.findRecordByIdOrClientId(userId, id)

    const record = await this.prisma.record.update({
      where: { id: existing.id },
      data: {
        type: dto.type,
        amount: dto.amount,
        category: dto.category,
        date: dto.date ? new Date(dto.date) : undefined,
        note: dto.note,
      },
    })

    this.logger.log(`[update] 更新成功: id=${record.id}`)
    return this.toCloudRecord(record as DbRecord)
  }

  /**
   * 删除记录（软删除）
   */
  async remove(userId: string, id: string): Promise<void> {
    this.logger.log(`[remove] userId=${userId}, id=${id}`)

    const existing = await this.findRecordByIdOrClientId(userId, id)

    await this.prisma.record.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    })

    this.logger.log(`[remove] 删除成功: id=${existing.id}`)
  }

  /**
   * 批量删除记录
   */
  async removeMany(userId: string, ids: string[]): Promise<number> {
    this.logger.log(`[removeMany] userId=${userId}, count=${ids.length}`)

    const result = await this.prisma.record.updateMany({
      where: {
        id: { in: ids },
        userId,
        deletedAt: null,
      },
      data: { deletedAt: new Date() },
    })

    this.logger.log(`[removeMany] 删除成功: count=${result.count}`)
    return result.count
  }

  /**
   * 根据 id 或 clientId 查找记录
   */
  private async findRecordByIdOrClientId(userId: string, id: string): Promise<DbRecord> {
    const record = await this.prisma.record.findFirst({
      where: {
        userId,
        deletedAt: null,
        OR: [{ id }, { clientId: id }],
      },
    })

    if (!record) {
      throw new NotFoundException(`记录不存在: ${id}`)
    }

    return record as DbRecord
  }

  /**
   * 转换为响应格式
   */
  private toCloudRecord(record: DbRecord): CloudRecord {
    return {
      id: record.id,
      type: record.type as 'income' | 'expense',
      amount: Number(record.amount),
      category: record.category,
      date: record.date.toISOString().split('T')[0],
      note: record.note || undefined,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      ledgerId: record.ledgerId,
    }
  }
}
