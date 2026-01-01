import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { UsersService } from '../users/users.service'
import { WechatService } from './wechat.service'
import { WechatLoginDto } from './dto/wechat-login.dto'
import { TokenResponseDto } from './dto/token-response.dto'

export interface JwtPayload {
  sub: string // userId
  phone: string
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly wechatService: WechatService,
  ) {}

  // 微信登录
  async wechatLogin(dto: WechatLoginDto): Promise<TokenResponseDto> {
    // 通过 code 获取微信用户信息
    const wechatUser = await this.wechatService.code2Session(dto.code)

    // 查找或创建用户
    let user = await this.usersService.findByOpenid(wechatUser.openid)
    let isNewUser = false

    if (!user) {
      isNewUser = true
      // 微信登录时，使用 openid 作为临时手机号（后续可绑定真实手机号）
      user = await this.usersService.create({
        phone: `wx_${wechatUser.openid}`,
        openid: wechatUser.openid,
        unionid: wechatUser.unionid,
        nickname: dto.nickname,
        avatar: dto.avatar,
      })
    } else if (dto.nickname || dto.avatar) {
      // 更新用户信息
      user = await this.usersService.update(user.id, {
        nickname: dto.nickname,
        avatar: dto.avatar,
      })
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
        openid: user.openid,
        nickname: user.nickname,
        avatar: user.avatar,
      },
      isNewUser,
    }
  }

  // 刷新 Token
  async refreshToken(userId: string): Promise<TokenResponseDto> {
    const user = await this.usersService.findById(userId)

    if (!user) {
      throw new UnauthorizedException('User not found')
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
        openid: user.openid,
        nickname: user.nickname,
        avatar: user.avatar,
      },
      isNewUser: false,
    }
  }

  // 验证 Token
  async validateToken(payload: JwtPayload) {
    const user = await this.usersService.findById(payload.sub)

    if (!user) {
      throw new UnauthorizedException('User not found')
    }

    return user
  }

  // 手机号登录/注册
  async phoneLogin(phone: string, nickname?: string): Promise<TokenResponseDto> {
    let user = await this.usersService.findByPhone(phone)
    let isNewUser = false

    if (!user) {
      isNewUser = true
      // 自动创建用户
      user = await this.usersService.create({
        phone,
        nickname: nickname || `用户${phone.slice(-4)}`,
      })
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
        openid: user.openid,
        nickname: user.nickname,
        avatar: user.avatar,
      },
      isNewUser,
    }
  }
}
