import { Injectable, Logger, Inject, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateLedgerDto, UpdateLedgerDto } from './dto/ledger.dto'

/**
 * 云端账本响应格式
 */
export interface CloudLedger {
  id: string
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
   * 创建账本（幂等：已存在则更新）
   */
  async create(userPhone: string, dto: CreateLedgerDto): Promise<CloudLedger> {
    this.logger.log(`[create] userPhone=${userPhone}, clientId=${dto.clientId}`)

    // 检查是否已存在
    const existing = await this.prisma.ledger.findFirst({
      where: { userPhone, clientId: dto.clientId, deletedAt: null },
    })

    if (existing) {
      // 已存在则更新
      const updated = await this.prisma.ledger.update({
        where: { id: existing.id },
        data: {
          name: dto.name,
          icon: dto.icon,
          color: dto.color,
        },
      })
      this.logger.log(`[create] 已存在，更新: id=${updated.id}`)
      return this.toCloudLedger(updated)
    }

    // 创建新账本
    const created = await this.prisma.ledger.create({
      data: {
        id: dto.clientId,
        userPhone,
        name: dto.name,
        icon: dto.icon,
        color: dto.color,
        clientId: dto.clientId,
      },
    })
    this.logger.log(`[create] 创建成功: id=${created.id}`)
    return this.toCloudLedger(created)
  }

  /**
   * 更新账本
   */
  async update(userPhone: string, id: string, dto: UpdateLedgerDto): Promise<CloudLedger> {
    this.logger.log(`[update] userPhone=${userPhone}, id=${id}`)

    const ledger = await this.findLedgerByIdOrClientId(userPhone, id)

    const updated = await this.prisma.ledger.update({
      where: { id: ledger.id },
      data: {
        name: dto.name ?? ledger.name,
        icon: dto.icon ?? ledger.icon,
        color: dto.color ?? ledger.color,
      },
    })
    this.logger.log(`[update] 更新成功: id=${updated.id}`)
    return this.toCloudLedger(updated)
  }

  /**
   * 删除账本（软删除）
   */
  async remove(userPhone: string, id: string): Promise<void> {
    this.logger.log(`[remove] userPhone=${userPhone}, id=${id}`)

    const ledger = await this.findLedgerByIdOrClientId(userPhone, id)

    // 检查是否有关联的记录
    const recordCount = await this.prisma.record.count({
      where: { ledgerId: ledger.id, deletedAt: null },
    })

    if (recordCount > 0) {
      throw new BadRequestException(`账本下还有 ${recordCount} 条记录，请先删除记录`)
    }

    await this.prisma.ledger.update({
      where: { id: ledger.id },
      data: { deletedAt: new Date() },
    })
    this.logger.log(`[remove] 删除成功: id=${ledger.id}`)
  }

  /**
   * 根据 id 或 clientId 查找账本
   */
  private async findLedgerByIdOrClientId(userPhone: string, id: string) {
    const ledger = await this.prisma.ledger.findFirst({
      where: {
        userPhone,
        OR: [{ id }, { clientId: id }],
        deletedAt: null,
      },
    })

    if (!ledger) {
      throw new NotFoundException(`账本不存在: ${id}`)
    }

    return ledger
  }

  /**
   * 转换为响应格式
   */
  private toCloudLedger(ledger: any): CloudLedger {
    return {
      id: ledger.id,
      name: ledger.name,
      icon: ledger.icon || undefined,
      color: ledger.color || undefined,
      createdAt: ledger.createdAt.toISOString(),
      updatedAt: ledger.updatedAt.toISOString(),
    }
  }
}
