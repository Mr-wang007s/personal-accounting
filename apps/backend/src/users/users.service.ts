import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { User } from '@prisma/client'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // 创建用户
  async create(dto: CreateUserDto): Promise<User> {
    return this.prisma.user.create({
      data: {
        phone: dto.phone,
        openid: dto.openid,
        unionid: dto.unionid,
        nickname: dto.nickname,
        avatar: dto.avatar,
        password: dto.password,
      },
    })
  }

  // 通过手机号查找用户
  async findByPhone(phone: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { phone },
    })
  }

  // 通过 openid 查找用户
  async findByOpenid(openid: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { openid },
    })
  }

  // 通过 ID 查找用户
  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    })
  }

  // 更新用户信息
  async update(id: string, dto: UpdateUserDto): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: {
        nickname: dto.nickname,
        avatar: dto.avatar,
      },
    })
  }

  // 删除用户（软删除相关数据）
  async delete(id: string): Promise<void> {
    // 先获取用户手机号
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { phone: true },
    })
    
    if (!user) {
      return
    }

    // 先软删除所有记录（通过 userPhone 关联）
    await this.prisma.record.updateMany({
      where: { userPhone: user.phone },
      data: { deletedAt: new Date() },
    })

    // 软删除账本（通过 userPhone 关联）
    await this.prisma.ledger.updateMany({
      where: { userPhone: user.phone },
      data: { deletedAt: new Date() },
    })

    // 删除用户
    await this.prisma.user.delete({
      where: { id },
    })
  }

  // 获取用户统计信息
  async getUserStats(userPhone: string) {
    const [recordCount, totalIncome, totalExpense] = await Promise.all([
      this.prisma.record.count({
        where: { userPhone, deletedAt: null },
      }),
      this.prisma.record.aggregate({
        where: { userPhone, type: 'income', deletedAt: null },
        _sum: { amount: true },
      }),
      this.prisma.record.aggregate({
        where: { userPhone, type: 'expense', deletedAt: null },
        _sum: { amount: true },
      }),
    ])

    return {
      recordCount,
      totalIncome: totalIncome._sum.amount?.toNumber() || 0,
      totalExpense: totalExpense._sum.amount?.toNumber() || 0,
    }
  }
}
