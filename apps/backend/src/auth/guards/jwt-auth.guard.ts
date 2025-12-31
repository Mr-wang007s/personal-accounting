import { Injectable, ExecutionContext, Inject } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { Reflector } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'
import { MOCK_USER } from '../constants/mock-user'

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    @Inject(Reflector) private reflector: Reflector,
    @Inject(ConfigService) private configService: ConfigService,
  ) {
    super()
  }

  canActivate(context: ExecutionContext) {
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
      // 注入 mock 用户到 request
      const request = context.switchToHttp().getRequest()
      request.user = { ...MOCK_USER }
      return true
    }

    return super.canActivate(context)
  }
}
