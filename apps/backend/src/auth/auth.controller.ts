import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiHeader,
} from '@nestjs/swagger'
import { AuthService } from './auth.service'
import { WechatLoginDto } from './dto/wechat-login.dto'
import { WxCloudLoginDto } from './dto/wx-cloud-login.dto'
import { DevLoginDto } from './dto/dev-login.dto'
import { TokenResponseDto } from './dto/token-response.dto'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { CurrentUser } from './decorators/current-user.decorator'
import { User } from '@prisma/client'

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('wechat/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '微信登录（code2Session）' })
  @ApiResponse({ status: 200, type: TokenResponseDto })
  async wechatLogin(@Body() dto: WechatLoginDto): Promise<TokenResponseDto> {
    return this.authService.wechatLogin(dto)
  }

  @Post('wx-cloud/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '微信云托管登录（自动获取 openid）' })
  @ApiHeader({ name: 'X-WX-OPENID', description: '微信 openid（云托管自动注入）', required: false })
  @ApiHeader({ name: 'X-WX-UNIONID', description: '微信 unionid（云托管自动注入）', required: false })
  @ApiResponse({ status: 200, type: TokenResponseDto })
  async wxCloudLogin(
    @Headers('x-wx-openid') openid: string,
    @Headers('x-wx-unionid') unionid: string,
    @Body() dto: WxCloudLoginDto,
  ): Promise<TokenResponseDto> {
    return this.authService.wxCloudLogin(openid, unionid, dto)
  }

  @Post('refresh')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: '刷新 Token' })
  @ApiResponse({ status: 200, type: TokenResponseDto })
  async refreshToken(@CurrentUser() user: User): Promise<TokenResponseDto> {
    return this.authService.refreshToken(user.id)
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户信息' })
  async getProfile(@CurrentUser() user: User) {
    return {
      id: user.id,
      phone: user.phone,
      openid: user.openid,
      nickname: user.nickname,
      avatar: user.avatar,
      createdAt: user.createdAt,
    }
  }

  // 手机号登录/注册接口
  @Post('phone/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '手机号登录/注册' })
  @ApiResponse({ status: 200, type: TokenResponseDto })
  async phoneLogin(@Body() dto: DevLoginDto): Promise<TokenResponseDto> {
    return this.authService.phoneLogin(dto.phone, dto.nickname)
  }
}
