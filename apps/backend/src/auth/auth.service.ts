import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { UsersService } from '../users/users.service'
import { WechatService } from './wechat.service'
import { WechatLoginDto } from './dto/wechat-login.dto'
import { TokenResponseDto } from './dto/token-response.dto'

export interface JwtPayload {
  sub: string // userId
  openid: string
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

    if (!user) {
      user = await this.usersService.create({
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
      openid: user.openid,
    }

    const accessToken = this.jwtService.sign(payload)

    return {
      accessToken,
      user: {
        id: user.id,
        openid: user.openid,
        nickname: user.nickname,
        avatar: user.avatar,
      },
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
      openid: user.openid,
    }

    const accessToken = this.jwtService.sign(payload)

    return {
      accessToken,
      user: {
        id: user.id,
        openid: user.openid,
        nickname: user.nickname,
        avatar: user.avatar,
      },
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

  // 开发环境模拟登录（也用于 Web/小程序注册登录）
  async devLogin(openid: string, nickname?: string): Promise<TokenResponseDto> {
    // if (process.env.NODE_ENV === 'production') {
    //   throw new UnauthorizedException('Dev login not allowed in production')
    // }

    let user = await this.usersService.findByOpenid(openid)

    if (!user) {
      // 自动创建用户，默认密码 20260101
      user = await this.usersService.create({
        openid,
        nickname: nickname || `User ${openid.slice(-4)}`,
        password: '20260101',
      })
    }

    const payload: JwtPayload = {
      sub: user.id,
      openid: user.openid,
    }

    const accessToken = this.jwtService.sign(payload)

    return {
      accessToken,
      user: {
        id: user.id,
        openid: user.openid,
        nickname: user.nickname,
        avatar: user.avatar,
      },
    }
  }
}
