import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

interface WechatSessionResponse {
  openid: string
  session_key: string
  unionid?: string
  errcode?: number
  errmsg?: string
}

export interface WechatUserInfo {
  openid: string
  unionid?: string
  sessionKey: string
}

@Injectable()
export class WechatService {
  private readonly appId: string
  private readonly appSecret: string

  constructor(private configService: ConfigService) {
    this.appId = this.configService.get('WECHAT_APP_ID', '')
    this.appSecret = this.configService.get('WECHAT_APP_SECRET', '')
  }

  // 通过 code 获取 session
  async code2Session(code: string): Promise<WechatUserInfo> {
    // 开发环境模拟
    if (
      process.env.NODE_ENV === 'development' &&
      (!this.appId || !this.appSecret)
    ) {
      console.warn('WeChat credentials not configured, using mock data')
      return {
        openid: `mock_openid_${code}`,
        sessionKey: 'mock_session_key',
      }
    }

    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${this.appId}&secret=${this.appSecret}&js_code=${code}&grant_type=authorization_code`

    try {
      const response = await fetch(url)
      const data = (await response.json()) as WechatSessionResponse

      if (data.errcode) {
        throw new UnauthorizedException(
          `WeChat auth failed: ${data.errmsg || 'Unknown error'}`,
        )
      }

      return {
        openid: data.openid,
        unionid: data.unionid,
        sessionKey: data.session_key,
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error
      }
      throw new UnauthorizedException('Failed to authenticate with WeChat')
    }
  }
}
