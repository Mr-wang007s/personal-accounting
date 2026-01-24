import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as nodemailer from 'nodemailer'

interface VerificationCode {
  code: string
  expireAt: number
  sendAt: number
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name)
  private transporter: nodemailer.Transporter | null = null

  // 验证码存储（生产环境应使用 Redis）
  private verificationCodes = new Map<string, VerificationCode>()

  // 配置常量
  private readonly CODE_LENGTH = 6
  private readonly CODE_EXPIRE_MINUTES = 5
  private readonly SEND_INTERVAL_SECONDS = 60
  private readonly MAX_DAILY_SEND = 10

  // 每日发送计数
  private dailySendCount = new Map<string, { count: number; date: string }>()

  constructor(private readonly configService: ConfigService) {
    this.initTransporter()
  }

  /**
   * 初始化邮件发送器
   */
  private initTransporter(): void {
    const host = this.configService.get<string>('SMTP_HOST')
    const port = this.configService.get<number>('SMTP_PORT')
    const user = this.configService.get<string>('SMTP_USER')
    const pass = this.configService.get<string>('SMTP_PASS')

    if (!host || !user || !pass) {
      this.logger.warn('邮件服务配置不完整，验证码将以日志形式输出')
      return
    }

    this.transporter = nodemailer.createTransport({
      host,
      port: port || 465,
      secure: true, // 使用 SSL
      auth: { user, pass },
    })

    // 验证连接
    this.transporter.verify((error) => {
      if (error) {
        this.logger.error('邮件服务连接失败:', error.message)
        this.transporter = null
      } else {
        this.logger.log('邮件服务连接成功')
      }
    })
  }

  /**
   * 生成随机验证码
   */
  private generateCode(): string {
    return Math.random().toString().slice(2, 2 + this.CODE_LENGTH)
  }

  /**
   * 检查发送频率限制
   */
  private checkRateLimit(email: string): void {
    const now = Date.now()
    const today = new Date().toISOString().split('T')[0]

    // 检查发送间隔
    const existing = this.verificationCodes.get(email)
    if (existing) {
      const elapsed = (now - existing.sendAt) / 1000
      if (elapsed < this.SEND_INTERVAL_SECONDS) {
        const remaining = Math.ceil(this.SEND_INTERVAL_SECONDS - elapsed)
        throw new BadRequestException(`请等待 ${remaining} 秒后再发送`)
      }
    }

    // 检查每日发送次数
    const dailyRecord = this.dailySendCount.get(email)
    if (dailyRecord) {
      if (dailyRecord.date === today && dailyRecord.count >= this.MAX_DAILY_SEND) {
        throw new BadRequestException('今日发送次数已达上限')
      }
      // 新的一天，重置计数
      if (dailyRecord.date !== today) {
        this.dailySendCount.set(email, { count: 0, date: today })
      }
    }
  }

  /**
   * 更新发送计数
   */
  private updateSendCount(email: string): void {
    const today = new Date().toISOString().split('T')[0]
    const record = this.dailySendCount.get(email)

    if (record && record.date === today) {
      record.count++
    } else {
      this.dailySendCount.set(email, { count: 1, date: today })
    }
  }

  /**
   * 发送验证码邮件
   */
  async sendVerificationCode(email: string): Promise<{ success: boolean; message: string }> {
    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      throw new BadRequestException('邮箱格式不正确')
    }

    // 检查频率限制
    this.checkRateLimit(email)

    // 生成验证码
    const code = this.generateCode()
    const now = Date.now()

    // 存储验证码
    this.verificationCodes.set(email, {
      code,
      expireAt: now + this.CODE_EXPIRE_MINUTES * 60 * 1000,
      sendAt: now,
    })

    // 更新发送计数
    this.updateSendCount(email)

    // E2E 测试模式：跳过真实邮件发送，直接返回验证码
    const isE2ETest = this.configService.get<string>('E2E_TEST') === 'true'
    if (isE2ETest) {
      this.logger.warn(`[E2E] 测试模式验证码: ${email} => ${code}`)
      return { success: true, message: `[开发模式] 验证码: ${code}` }
    }

    // 发送邮件
    if (this.transporter) {
      try {
        const fromName = this.configService.get<string>('SMTP_FROM_NAME') || '个人记账'
        const fromEmail = this.configService.get<string>('SMTP_USER')

        await this.transporter.sendMail({
          from: `"${fromName}" <${fromEmail}>`,
          to: email,
          subject: '【柴十七记账】登录验证码',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #4F46E5;">柴十七记账 - 登录验证</h2>
              <p>您好！</p>
              <p>您的登录验证码是：</p>
              <div style="background: #F3F4F6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #4F46E5;">${code}</span>
              </div>
              <p>验证码有效期为 ${this.CODE_EXPIRE_MINUTES} 分钟，请尽快使用。</p>
              <p style="color: #6B7280; font-size: 12px;">如果这不是您的操作，请忽略此邮件。</p>
              <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;">
              <p style="color: #9CA3AF; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>
            </div>
          `,
        })

        this.logger.log(`[sendVerificationCode] 验证码已发送: email=${email}`)
        return { success: true, message: '验证码已发送，请查收邮箱' }
      } catch (error) {
        this.logger.error(`[sendVerificationCode] 发送失败:`, error)
        throw new BadRequestException('邮件发送失败，请稍后重试')
      }
    } else {
      // 开发模式：输出到日志
      this.logger.warn(`[DEV] 验证码: ${email} => ${code}`)
      return { success: true, message: `[开发模式] 验证码: ${code}` }
    }
  }

  /**
   * 验证验证码
   */
  verifyCode(email: string, code: string): boolean {
    const record = this.verificationCodes.get(email)

    if (!record) {
      this.logger.warn(`[verifyCode] 验证码不存在: email=${email}`)
      return false
    }

    // 检查是否过期
    if (Date.now() > record.expireAt) {
      this.verificationCodes.delete(email)
      this.logger.warn(`[verifyCode] 验证码已过期: email=${email}`)
      return false
    }

    // 验证码比对
    if (record.code !== code) {
      this.logger.warn(`[verifyCode] 验证码错误: email=${email}`)
      return false
    }

    // 验证成功，删除验证码（一次性使用）
    this.verificationCodes.delete(email)
    this.logger.log(`[verifyCode] 验证成功: email=${email}`)
    return true
  }
}
