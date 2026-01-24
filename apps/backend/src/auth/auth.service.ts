import { Injectable, UnauthorizedException, BadRequestException, Logger, Inject } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { UsersService, UserWithAuths } from '../users/users.service'
import { PrismaService } from '../prisma/prisma.service'
import { EmailService } from '../email/email.service'
import { LoginResponseDto } from './dto/login-response.dto'
import { AuthType, AuthUser } from '@personal-accounting/shared'

export interface JwtPayload {
  sub: string // userId
  authType: AuthType
  identifier: string
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    @Inject(PrismaService) private prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * 邮箱登录/注册
   */
  async emailLogin(email: string, nickname?: string): Promise<LoginResponseDto> {
    let user = await this.usersService.findByEmail(email)
    let isNewUser = false

    if (!user) {
      isNewUser = true
      user = await this.usersService.createWithAuth(
        { nickname: nickname || email.split('@')[0] },
        { authType: 'email', identifier: email, verified: true }
      )

      // 为新用户创建默认账本
      await this.createDefaultLedger(user.id)
      this.logger.log(`[emailLogin] 新用户注册: email=${email}`)
    }

    return this.generateLoginResponse(user, 'email', email, isNewUser)
  }

  /**
   * 手机号登录/注册（预留，需要短信验证）
   */
  async phoneLogin(phone: string, nickname?: string): Promise<LoginResponseDto> {
    let user = await this.usersService.findByPhone(phone)
    let isNewUser = false

    if (!user) {
      isNewUser = true
      user = await this.usersService.createWithAuth(
        { nickname: nickname || `用户${phone.slice(-4)}` },
        { authType: 'phone', identifier: phone, verified: false }
      )

      await this.createDefaultLedger(user.id)
      this.logger.log(`[phoneLogin] 新用户注册: phone=${phone}`)
    }

    return this.generateLoginResponse(user, 'phone', phone, isNewUser)
  }

  /**
   * 微信登录（小程序/公众号）
   */
  async wechatLogin(openid: string, unionid?: string, nickname?: string, avatar?: string): Promise<LoginResponseDto> {
    let user = await this.usersService.findByWechatOpenid(openid)
    let isNewUser = false

    if (!user) {
      isNewUser = true
      user = await this.usersService.createWithAuth(
        { nickname: nickname || '微信用户', avatar },
        { authType: 'wechat', identifier: openid, provider: 'wechat', unionid, verified: true }
      )

      await this.createDefaultLedger(user.id)
      this.logger.log(`[wechatLogin] 新用户注册: openid=${openid}`)
    }

    return this.generateLoginResponse(user, 'wechat', openid, isNewUser)
  }

  /**
   * 绑定新的登录方式
   */
  async bindAuth(userId: string, authType: AuthType, identifier: string, credential?: string): Promise<void> {
    // 检查是否已被其他用户绑定
    const existing = await this.usersService.findByAuth(authType, identifier)
    if (existing && existing.id !== userId) {
      throw new BadRequestException('该账号已被其他用户绑定')
    }

    // 检查当前用户是否已绑定该类型
    const user = await this.usersService.findById(userId)
    if (user?.auths.some(a => a.authType === authType)) {
      throw new BadRequestException('已绑定该类型的登录方式')
    }

    await this.usersService.addAuth({
      userId,
      authType,
      identifier,
      credential,
      verified: false,
    })

    this.logger.log(`[bindAuth] 绑定成功: userId=${userId}, authType=${authType}`)
  }

  /**
   * 为新用户创建默认账本
   */
  private async createDefaultLedger(userId: string): Promise<void> {
    const clientId = `ledger_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    await this.prisma.ledger.create({
      data: {
        id: clientId,
        userId,
        name: '日常账本',
        icon: '📒',
        clientId,
      },
    })

    this.logger.log(`[createDefaultLedger] 已创建默认账本: userId=${userId}`)
  }

  /**
   * 生成登录响应
   */
  private async generateLoginResponse(
    user: UserWithAuths,
    authType: AuthType,
    identifier: string,
    isNewUser: boolean
  ): Promise<LoginResponseDto> {
    const payload: JwtPayload = {
      sub: user.id,
      authType,
      identifier,
    }

    const accessToken = this.jwtService.sign(payload)
    const boundAuths = await this.usersService.getBoundAuths(user.id)

    const authUser: AuthUser = {
      id: user.id,
      nickname: user.nickname || undefined,
      avatar: user.avatar || undefined,
      status: user.status as 'active' | 'inactive' | 'banned',
      authType,
      identifier,
      boundAuths,
    }

    return {
      accessToken,
      user: authUser,
      isNewUser,
    }
  }

  /**
   * 刷新 Token
   */
  async refreshToken(userId: string): Promise<LoginResponseDto> {
    const user = await this.usersService.findById(userId)

    if (!user) {
      throw new UnauthorizedException('用户不存在')
    }

    // 使用第一个认证方式
    const primaryAuth = user.auths[0]
    if (!primaryAuth) {
      throw new UnauthorizedException('用户无有效认证方式')
    }

    return this.generateLoginResponse(
      user,
      primaryAuth.authType as AuthType,
      primaryAuth.identifier,
      false
    )
  }

  /**
   * 验证 Token（供 JwtStrategy 调用）
   */
  async validateToken(payload: JwtPayload) {
    const user = await this.usersService.findById(payload.sub)

    if (!user) {
      throw new UnauthorizedException('用户不存在')
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('用户已被禁用')
    }

    return user
  }

  /**
   * 发送邮箱验证码
   */
  async sendEmailCode(email: string): Promise<{ success: boolean; message: string }> {
    return this.emailService.sendVerificationCode(email)
  }

  /**
   * 邮箱验证码登录
   */
  async verifyEmailCodeLogin(email: string, code: string, nickname?: string): Promise<LoginResponseDto> {
    const isValid = this.emailService.verifyCode(email, code)
    if (!isValid) {
      throw new BadRequestException('验证码错误或已过期')
    }

    return this.emailLogin(email, nickname)
  }
}
