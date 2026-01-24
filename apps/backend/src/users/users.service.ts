import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { User, UserAuth } from '@prisma/client'
import { AuthType } from '@personal-accounting/shared'

// 用户创建参数
export interface CreateUserParams {
  nickname?: string
  avatar?: string
}

// 认证创建参数
export interface CreateAuthParams {
  userId: string
  authType: AuthType
  identifier: string
  credential?: string
  provider?: string
  unionid?: string
  verified?: boolean
}

// 用户及其认证信息
export type UserWithAuths = User & { auths: UserAuth[] }

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * 创建用户（仅创建基础信息）
   */
  async create(params: CreateUserParams): Promise<User> {
    return this.prisma.user.create({
      data: {
        nickname: params.nickname,
        avatar: params.avatar,
        status: 'active',
      },
    })
  }

  /**
   * 创建用户并绑定认证方式（事务）
   */
  async createWithAuth(
    userParams: CreateUserParams,
    authParams: Omit<CreateAuthParams, 'userId'>
  ): Promise<UserWithAuths> {
    return this.prisma.$transaction(async (tx) => {
      // 创建用户
      const user = await tx.user.create({
        data: {
          nickname: userParams.nickname,
          avatar: userParams.avatar,
          status: 'active',
        },
      })

      // 创建认证记录
      await tx.userAuth.create({
        data: {
          userId: user.id,
          authType: authParams.authType,
          identifier: authParams.identifier,
          credential: authParams.credential,
          provider: authParams.provider,
          unionid: authParams.unionid,
          verified: authParams.verified ?? false,
        },
      })

      // 返回带认证的用户
      return tx.user.findUnique({
        where: { id: user.id },
        include: { auths: true },
      }) as Promise<UserWithAuths>
    })
  }

  /**
   * 通过认证方式查找用户
   */
  async findByAuth(authType: AuthType, identifier: string): Promise<UserWithAuths | null> {
    const auth = await this.prisma.userAuth.findUnique({
      where: {
        authType_identifier: {
          authType,
          identifier,
        },
      },
      include: {
        user: {
          include: { auths: true },
        },
      },
    })

    return auth?.user || null
  }

  /**
   * 通过邮箱查找用户
   */
  async findByEmail(email: string): Promise<UserWithAuths | null> {
    return this.findByAuth('email', email)
  }

  /**
   * 通过手机号查找用户
   */
  async findByPhone(phone: string): Promise<UserWithAuths | null> {
    return this.findByAuth('phone', phone)
  }

  /**
   * 通过微信 openid 查找用户
   */
  async findByWechatOpenid(openid: string): Promise<UserWithAuths | null> {
    return this.findByAuth('wechat', openid)
  }

  /**
   * 通过 ID 查找用户
   */
  async findById(id: string): Promise<UserWithAuths | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: { auths: true },
    })
  }

  /**
   * 添加认证方式（绑定新的登录方式）
   */
  async addAuth(params: CreateAuthParams): Promise<UserAuth> {
    return this.prisma.userAuth.create({
      data: {
        userId: params.userId,
        authType: params.authType,
        identifier: params.identifier,
        credential: params.credential,
        provider: params.provider,
        unionid: params.unionid,
        verified: params.verified ?? false,
      },
    })
  }

  /**
   * 更新用户信息
   */
  async update(id: string, data: { nickname?: string; avatar?: string }): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: {
        nickname: data.nickname,
        avatar: data.avatar,
      },
    })
  }

  /**
   * 删除用户（软删除相关数据）
   */
  async delete(id: string): Promise<void> {
    // 先软删除所有记录
    await this.prisma.record.updateMany({
      where: { userId: id },
      data: { deletedAt: new Date() },
    })

    // 软删除账本
    await this.prisma.ledger.updateMany({
      where: { userId: id },
      data: { deletedAt: new Date() },
    })

    // 删除认证记录
    await this.prisma.userAuth.deleteMany({
      where: { userId: id },
    })

    // 删除用户
    await this.prisma.user.delete({
      where: { id },
    })
  }

  /**
   * 获取用户统计信息
   */
  async getUserStats(userId: string) {
    const [recordCount, totalIncome, totalExpense] = await Promise.all([
      this.prisma.record.count({
        where: { userId, deletedAt: null },
      }),
      this.prisma.record.aggregate({
        where: { userId, type: 'income', deletedAt: null },
        _sum: { amount: true },
      }),
      this.prisma.record.aggregate({
        where: { userId, type: 'expense', deletedAt: null },
        _sum: { amount: true },
      }),
    ])

    return {
      recordCount,
      totalIncome: totalIncome._sum.amount?.toNumber() || 0,
      totalExpense: totalExpense._sum.amount?.toNumber() || 0,
    }
  }

  /**
   * 获取用户已绑定的认证方式
   */
  async getBoundAuths(userId: string) {
    const auths = await this.prisma.userAuth.findMany({
      where: { userId },
      select: {
        authType: true,
        identifier: true,
        verified: true,
        provider: true,
      },
    })

    return auths.map((auth) => ({
      authType: auth.authType as AuthType,
      identifier: this.maskIdentifier(auth.authType as AuthType, auth.identifier),
      verified: auth.verified,
      provider: auth.provider,
    }))
  }

  /**
   * 脱敏处理标识符
   */
  private maskIdentifier(authType: AuthType, identifier: string): string {
    switch (authType) {
      case 'email':
        const [name, domain] = identifier.split('@')
        return name.length > 2 
          ? `${name.slice(0, 2)}***@${domain}` 
          : `${name[0]}***@${domain}`
      case 'phone':
        return identifier.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
      default:
        return identifier.slice(0, 4) + '****'
    }
  }
}
