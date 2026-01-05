import { Injectable, Logger, Inject, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateLedgerDto, UpdateLedgerDto } from './dto/ledger.dto'

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

@Injectable()
export class LedgersService {
  private readonly logger = new Logger(LedgersService.name)

  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  /**
   * 创建账本
   */
  async create(userPhone: string, dto: CreateLedgerDto): Promise<CloudLedger> {
    this.logger.log(`[CreateLedger] userPhone=${userPhone}, clientId=${dto.clientId}`)

    // 检查是否已存在
    const existing = await this.prisma.ledger.findFirst({
      where: { userPhone, clientId: dto.clientId, deletedAt: null },
    })

    if (existing) {
      // 如果已存在，更新并返回
      const updated = await this.prisma.ledger.update({
        where: { id: existing.id },
        data: {
          name: dto.name,
          icon: dto.icon,
          color: dto.color,
        },
      })
      this.logger.log(`[CreateLedger] 已存在，更新: serverId=${updated.id}`)
      return this.toCloudLedger(updated)
    }

    // 创建新账本
    const created = await this.prisma.ledger.create({
      data: {
        id: dto.clientId, // 使用 clientId 作为 serverId
        userPhone,
        name: dto.name,
        icon: dto.icon,
        color: dto.color,
        clientId: dto.clientId,
        createdAt: dto.createdAt ? new Date(dto.createdAt) : new Date(),
      },
    })
    this.logger.log(`[CreateLedger] 创建成功: serverId=${created.id}`)
    return this.toCloudLedger(created)
  }

  /**
   * 更新账本
   */
  async update(userPhone: string, clientId: string, dto: UpdateLedgerDto): Promise<CloudLedger> {
    this.logger.log(`[UpdateLedger] userPhone=${userPhone}, clientId=${clientId}`)

    // 查找账本
    const ledger = await this.prisma.ledger.findFirst({
      where: {
        userPhone,
        OR: [{ clientId }, { id: clientId }],
        deletedAt: null,
      },
    })

    if (!ledger) {
      throw new NotFoundException(`账本不存在: ${clientId}`)
    }

    // 更新账本
    const updated = await this.prisma.ledger.update({
      where: { id: ledger.id },
      data: {
        name: dto.name ?? ledger.name,
        icon: dto.icon ?? ledger.icon,
        color: dto.color ?? ledger.color,
      },
    })
    this.logger.log(`[UpdateLedger] 更新成功: serverId=${updated.id}`)
    return this.toCloudLedger(updated)
  }

  /**
   * 获取用户所有账本
   */
  async findAll(userPhone: string): Promise<CloudLedger[]> {
    const ledgers = await this.prisma.ledger.findMany({
      where: { userPhone, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    })
    return ledgers.map((l) => this.toCloudLedger(l))
  }

  /**
   * 获取单个账本
   */
  async findOne(userPhone: string, clientId: string): Promise<CloudLedger> {
    const ledger = await this.prisma.ledger.findFirst({
      where: {
        userPhone,
        OR: [{ clientId }, { id: clientId }],
        deletedAt: null,
      },
    })

    if (!ledger) {
      throw new NotFoundException(`账本不存在: ${clientId}`)
    }

    return this.toCloudLedger(ledger)
  }

  private toCloudLedger(ledger: any): CloudLedger {
    return {
      serverId: ledger.id,
      clientId: ledger.clientId || ledger.id,
      name: ledger.name,
      icon: ledger.icon || undefined,
      color: ledger.color || undefined,
      createdAt: ledger.createdAt.toISOString(),
      updatedAt: ledger.updatedAt.toISOString(),
    }
  }
}
