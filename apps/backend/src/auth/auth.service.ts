import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { UsersService } from '../users/users.service'
import { WxCloudLoginDto } from './dto/wx-cloud-login.dto'
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
  ) {}

  /**
   * 微信云托管登录
   * 直接从 HTTP Header 获取 openid，无需 code2Session
   */
  async wxCloudLogin(
    headerOpenid: string | undefined,
    headerUnionid: string | undefined,
    dto: WxCloudLoginDto,
  ): Promise<TokenResponseDto> {
    const openid = headerOpenid
    const unionid = headerUnionid

    // 云托管必须注入 openid
    if (!openid) {
      throw new UnauthorizedException(
        '无法获取用户身份，请确保通过微信云托管访问',
      )
    }

    // 查找或创建用户
    let user = await this.usersService.findByOpenid(openid)
    let isNewUser = false

    if (!user) {
      isNewUser = true
      user = await this.usersService.create({
        phone: `wx_${openid}`,
        openid,
        unionid,
        nickname: dto.nickname,
        avatar: dto.avatar,
      })
    } else if (dto.nickname || dto.avatar) {
      // 更新用户信息
      const updateData: { nickname?: string; avatar?: string; unionid?: string } = {}
      if (dto.nickname) updateData.nickname = dto.nickname
      if (dto.avatar) updateData.avatar = dto.avatar
      if (unionid && !user.unionid) updateData.unionid = unionid
      
      if (Object.keys(updateData).length > 0) {
        user = await this.usersService.update(user.id, updateData)
      }
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

  // 手机号登录/注册（保留用于开发测试）
  async phoneLogin(phone: string, nickname?: string): Promise<TokenResponseDto> {
    let user = await this.usersService.findByPhone(phone)
    let isNewUser = false

    if (!user) {
      isNewUser = true
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
