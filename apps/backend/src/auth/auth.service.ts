import { Injectable, UnauthorizedException, Logger, Inject } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { UsersService } from '../users/users.service'
import { PrismaService } from '../prisma/prisma.service'
import { LoginResponseDto } from './dto/login-response.dto'

export interface JwtPayload {
  sub: string // userId
  phone: string
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    @Inject(PrismaService) private prisma: PrismaService,
  ) {}

  /**
   * 手机号登录/注册
   * 暂未接入短信验证平台，只需手机号即可登录
   * 新用户自动创建默认账本
   */
  async phoneLogin(phone: string, nickname?: string): Promise<LoginResponseDto> {
    let user = await this.usersService.findByPhone(phone)
    let isNewUser = false

    if (!user) {
      // 新用户注册
      isNewUser = true
      user = await this.usersService.create({
        phone,
        nickname: nickname || `用户${phone.slice(-4)}`,
      })

      // 为新用户创建默认账本
      await this.createDefaultLedger(phone)
      this.logger.log(`[phoneLogin] 新用户注册: phone=${phone}`)
    }

    // 生成 JWT
    const payload: JwtPayload = {
      sub: user.id,
      phone: user.phone,
    }

    const accessToken = this.jwtService.sign(payload)

    return {
      accessToken,
      user: {
        id: user.id,
        phone: user.phone,
        openid: user.openid || undefined,
        nickname: user.nickname || undefined,
        avatar: user.avatar || undefined,
      },
      isNewUser,
    }
  }

  /**
   * 为新用户创建默认账本
   */
  private async createDefaultLedger(userPhone: string): Promise<void> {
    const clientId = `ledger_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    await this.prisma.ledger.create({
      data: {
        id: clientId,
        userPhone,
        name: '日常账本',
        icon: '📒',
        clientId,
      },
    })

    this.logger.log(`[createDefaultLedger] 已创建默认账本: userPhone=${userPhone}`)
  }

  /**
   * 刷新 Token
   */
  async refreshToken(userId: string): Promise<LoginResponseDto> {
    const user = await this.usersService.findById(userId)

    if (!user) {
      throw new UnauthorizedException('用户不存在')
    }

    const payload: JwtPayload = {
      sub: user.id,
      phone: user.phone,
    }

    const accessToken = this.jwtService.sign(payload)

    return {
      accessToken,
      user: {
        id: user.id,
        phone: user.phone,
        openid: user.openid || undefined,
        nickname: user.nickname || undefined,
        avatar: user.avatar || undefined,
      },
      isNewUser: false,
    }
  }

  /**
   * 验证 Token（供 JwtStrategy 调用）
   */
  async validateToken(payload: JwtPayload) {
    const user = await this.usersService.findById(payload.sub)

    if (!user) {
      throw new UnauthorizedException('用户不存在')
    }

    return user
  }
}
