import { Injectable, UnauthorizedException, Inject } from '@nestjs/common'
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

  constructor(@Inject(ConfigService) private configService: ConfigService) {
    this.appId = this.configService.get<string>('WECHAT_APP_ID', '')
    this.appSecret = this.configService.get<string>('WECHAT_APP_SECRET', '')
  }

  // 通过 code 获取 session
  async code2Session(code: string): Promise<WechatUserInfo> {
    // 检查配置
    console.log('[WechatService] code2Session called, appId:', this.appId ? `${this.appId.substring(0, 6)}...` : 'NOT SET')
    console.log('[WechatService] appSecret:', this.appSecret ? 'SET' : 'NOT SET')

    // 如果没有配置凭证，返回详细错误
    if (!this.appId || !this.appSecret) {
      console.error('[WechatService] Missing credentials - appId:', !!this.appId, 'appSecret:', !!this.appSecret)
      throw new UnauthorizedException(
        'WeChat credentials not configured. Please set WECHAT_APP_ID and WECHAT_APP_SECRET environment variables.',
      )
    }

    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${this.appId}&secret=${this.appSecret}&js_code=${code}&grant_type=authorization_code`

    try {
      console.log('[WechatService] Calling WeChat API...')
      const response = await fetch(url)
      const data = (await response.json()) as WechatSessionResponse
      console.log('[WechatService] WeChat API response:', { errcode: data.errcode, errmsg: data.errmsg, hasOpenid: !!data.openid })

      if (data.errcode) {
        throw new UnauthorizedException(
          `WeChat auth failed (${data.errcode}): ${data.errmsg || 'Unknown error'}`,
        )
      }

      return {
        openid: data.openid,
        unionid: data.unionid,
        sessionKey: data.session_key,
      }
    } catch (error) {
      console.error('[WechatService] Error:', error)
      if (error instanceof UnauthorizedException) {
        throw error
      }
      throw new UnauthorizedException(`Failed to authenticate with WeChat: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}
