import { Injectable, NotFoundException, Inject } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CacheService } from '../cache/cache.service'
import { Record, RecordType, Prisma } from '@prisma/client'
import { CreateRecordDto } from './dto/create-record.dto'
import { UpdateRecordDto } from './dto/update-record.dto'
import { QueryRecordsDto } from './dto/query-records.dto'

// 本地定义类型
export interface FormattedRecord {
  id: string
  type: 'income' | 'expense'
  amount: number
  category: string
  date: string
  note?: string
  createdAt: string
}

export interface Statistics {
  totalIncome: number
  totalExpense: number
  balance: number
  recordCount: number
}

export interface CategoryBreakdown {
  category: string
  amount: number
  count: number
  percentage: number
}

export interface MonthlyTrend {
  month: string
  income: number
  expense: number
  balance: number
}

@Injectable()
export class RecordsService {
  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
    @Inject(CacheService) private cache: CacheService,
  ) {}

  // 创建记录
  async create(userId: string, dto: CreateRecordDto): Promise<Record> {
    const record = await this.prisma.record.create({
      data: {
        userId,
        type: dto.type as RecordType,
        amount: dto.amount,
        category: dto.category,
        date: new Date(dto.date),
        note: dto.note,
        clientId: dto.clientId,
        ledgerId: dto.ledgerId,
      },
    })

    // 清除缓存
    this.invalidateUserCache(userId)

    return record
  }

  // 批量创建记录（用于同步）
  async createMany(
    userId: string,
    records: CreateRecordDto[],
  ): Promise<number> {
    const result = await this.prisma.record.createMany({
      data: records.map((dto) => ({
        userId,
        type: dto.type as RecordType,
        amount: dto.amount,
        category: dto.category,
        date: new Date(dto.date),
        note: dto.note,
        clientId: dto.clientId,
        ledgerId: dto.ledgerId,
      })),
    })

    this.invalidateUserCache(userId)

    return result.count
  }

  // 查询记录列表
  async findAll(userId: string, query: QueryRecordsDto) {
    const where: Prisma.RecordWhereInput = {
      userId,
      deletedAt: null,
    }

    // 类型筛选
    if (query.type) {
      where.type = query.type as RecordType
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

    // 关键词搜索 (SQLite 不支持 insensitive mode，使用 contains)
    if (query.keyword) {
      where.note = {
        contains: query.keyword,
      }
    }

    const [records, total] = await Promise.all([
      this.prisma.record.findMany({
        where,
        orderBy: { date: query.sortOrder || 'desc' },
        skip: ((query.page || 1) - 1) * (query.pageSize || 20),
        take: query.pageSize || 20,
      }),
      this.prisma.record.count({ where }),
    ])

    return {
      records: records.map((r) => this.formatRecord(r)),
      total,
      page: query.page || 1,
      pageSize: query.pageSize || 20,
    }
  }

  // 查询单条记录
  async findOne(userId: string, id: string): Promise<Record> {
    const record = await this.prisma.record.findFirst({
      where: { id, userId, deletedAt: null },
    })

    if (!record) {
      throw new NotFoundException('Record not found')
    }

    return record
  }

  // 更新记录
  async update(
    userId: string,
    id: string,
    dto: UpdateRecordDto,
  ): Promise<Record> {
    await this.findOne(userId, id)

    const record = await this.prisma.record.update({
      where: { id },
      data: {
        type: dto.type as RecordType | undefined,
        amount: dto.amount,
        category: dto.category,
        date: dto.date ? new Date(dto.date) : undefined,
        note: dto.note,
      },
    })

    this.invalidateUserCache(userId)

    return record
  }

  // 删除记录（软删除）
  async remove(userId: string, id: string): Promise<void> {
    await this.findOne(userId, id)

    await this.prisma.record.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    })

    this.invalidateUserCache(userId)
  }

  // 批量删除记录
  async removeMany(userId: string, ids: string[]): Promise<number> {
    const result = await this.prisma.record.updateMany({
      where: {
        id: { in: ids },
        userId,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    })

    this.invalidateUserCache(userId)

    return result.count
  }

  // 获取统计数据
  async getStatistics(
    userId: string,
    startDate: string,
    endDate: string,
  ): Promise<Statistics> {
    const cacheKey = CacheService.keys.userStats(
      userId,
      `${startDate}_${endDate}`,
    )
    const cached = this.cache.get<Statistics>(cacheKey)

    if (cached) {
      return cached
    }

    const records = await this.prisma.record.findMany({
      where: {
        userId,
        deletedAt: null,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
    })

    const formattedRecords = records.map((r) => this.formatRecord(r))
    const stats = this.calculateStatistics(formattedRecords)

    // 缓存 5 分钟
    this.cache.set(cacheKey, stats, 300)

    return stats
  }

  // 获取月度趋势
  async getMonthlyTrend(userId: string, year: number): Promise<MonthlyTrend[]> {
    const startDate = new Date(year, 0, 1)
    const endDate = new Date(year, 11, 31)

    const records = await this.prisma.record.findMany({
      where: {
        userId,
        deletedAt: null,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    })

    const formattedRecords = records.map((r) => this.formatRecord(r))
    return this.calculateMonthlyTrend(formattedRecords, year)
  }

  // 获取分类统计
  async getCategoryBreakdown(
    userId: string,
    type: 'income' | 'expense',
    startDate: string,
    endDate: string,
  ): Promise<CategoryBreakdown[]> {
    const records = await this.prisma.record.findMany({
      where: {
        userId,
        type: type as RecordType,
        deletedAt: null,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
    })

    const formattedRecords = records.map((r) => this.formatRecord(r))
    return this.calculateCategoryBreakdown(formattedRecords)
  }

  // 计算统计数据
  private calculateStatistics(records: FormattedRecord[]): Statistics {
    let totalIncome = 0
    let totalExpense = 0

    for (const record of records) {
      if (record.type === 'income') {
        totalIncome += record.amount
      } else {
        totalExpense += record.amount
      }
    }

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      recordCount: records.length,
    }
  }

  // 计算月度趋势
  private calculateMonthlyTrend(
    records: FormattedRecord[],
    year: number,
  ): MonthlyTrend[] {
    const monthlyData: Map<string, { income: number; expense: number }> =
      new Map()

    // 初始化 12 个月
    for (let i = 1; i <= 12; i++) {
      const month = `${year}-${i.toString().padStart(2, '0')}`
      monthlyData.set(month, { income: 0, expense: 0 })
    }

    // 统计每月数据
    for (const record of records) {
      const month = record.date.substring(0, 7)
      const data = monthlyData.get(month)
      if (data) {
        if (record.type === 'income') {
          data.income += record.amount
        } else {
          data.expense += record.amount
        }
      }
    }

    // 转换为数组
    return Array.from(monthlyData.entries()).map(([month, data]) => ({
      month,
      income: data.income,
      expense: data.expense,
      balance: data.income - data.expense,
    }))
  }

  // 计算分类统计
  private calculateCategoryBreakdown(
    records: FormattedRecord[],
  ): CategoryBreakdown[] {
    const categoryData: Map<string, { amount: number; count: number }> =
      new Map()
    let total = 0

    for (const record of records) {
      const existing = categoryData.get(record.category) || {
        amount: 0,
        count: 0,
      }
      existing.amount += record.amount
      existing.count += 1
      total += record.amount
      categoryData.set(record.category, existing)
    }

    return Array.from(categoryData.entries())
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count,
        percentage: total > 0 ? (data.amount / total) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
  }

  // 格式化记录
  private formatRecord(record: Record): FormattedRecord {
    return {
      id: record.id,
      type: record.type as 'income' | 'expense',
      amount: Number(record.amount),
      category: record.category,
      date: record.date.toISOString().split('T')[0],
      note: record.note || undefined,
      createdAt: record.createdAt.toISOString(),
    }
  }

  // 清除用户缓存
  private invalidateUserCache(userId: string): void {
    this.cache.del(CacheService.keys.userRecords(userId))
    // 清除所有统计缓存
    this.cache.delByPrefix(`user:${userId}:stats:`)
  }
}
