import { Injectable, ExecutionContext, Inject } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { Reflector } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'
import { MOCK_USER } from '../constants/mock-user'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private mockUserEnsured = false

  constructor(
    @Inject(Reflector) private reflector: Reflector,
    @Inject(ConfigService) private configService: ConfigService,
    @Inject(PrismaService) private prisma: PrismaService,
  ) {
    super()
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (isPublic) {
      return true
    }

    // 开发环境跳过认证：当 SKIP_AUTH=true 且非生产环境时
    const skipAuth = this.configService.get<string>('SKIP_AUTH') === 'true'
    const nodeEnv = this.configService.get<string>('NODE_ENV')
    
    if (skipAuth && nodeEnv !== 'production') {
      // 确保 mock 用户存在于数据库中（只执行一次）
      if (!this.mockUserEnsured) {
        await this.ensureMockUserExists()
        this.mockUserEnsured = true
      }
      
      // 注入 mock 用户到 request
      const request = context.switchToHttp().getRequest()
      request.user = { ...MOCK_USER }
      return true
    }

    return super.canActivate(context) as Promise<boolean>
  }

  /**
   * 确保 mock 用户存在于数据库中
   */
  private async ensureMockUserExists(): Promise<void> {
    try {
      await this.prisma.user.upsert({
        where: { id: MOCK_USER.id },
        update: {},
        create: {
          id: MOCK_USER.id,
          openid: MOCK_USER.openid,
          nickname: MOCK_USER.nickname,
          avatar: MOCK_USER.avatar,
        },
      })
    } catch (error) {
      console.warn('[JwtAuthGuard] Failed to ensure mock user exists:', error)
    }
  }
}
