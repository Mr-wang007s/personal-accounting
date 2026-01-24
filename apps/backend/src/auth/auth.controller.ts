import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger'
import { AuthService } from './auth.service'
import { PhoneLoginDto } from './dto/phone-login.dto'
import { SendEmailCodeDto } from './dto/send-email-code.dto'
import { EmailLoginDto } from './dto/email-login.dto'
import { LoginResponseDto } from './dto/login-response.dto'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { CurrentUser } from './decorators/current-user.decorator'
import { User } from '@prisma/client'
import { UsersService } from '../users/users.service'

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * 手机号登录（开发/测试用，无需验证码）
   */
  @Post('phone/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '手机号登录/注册（无验证码，开发用）' })
  @ApiResponse({ status: 200, type: LoginResponseDto })
  async phoneLogin(@Body() dto: PhoneLoginDto): Promise<LoginResponseDto> {
    return this.authService.phoneLogin(dto.phone, dto.nickname)
  }

  /**
   * 发送邮箱验证码
   */
  @Post('email/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '发送邮箱验证码' })
  @ApiResponse({ status: 200, description: '验证码发送成功' })
  async sendEmailCode(@Body() dto: SendEmailCodeDto): Promise<{ success: boolean; message: string }> {
    return this.authService.sendEmailCode(dto.email)
  }

  /**
   * 邮箱验证码登录
   */
  @Post('email/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '邮箱验证码登录/注册' })
  @ApiResponse({ status: 200, type: LoginResponseDto })
  async emailLogin(@Body() dto: EmailLoginDto): Promise<LoginResponseDto> {
    return this.authService.verifyEmailCodeLogin(dto.email, dto.code, dto.nickname)
  }

  /**
   * 获取当前用户信息
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户信息' })
  async getMe(@CurrentUser() user: User) {
    const boundAuths = await this.usersService.getBoundAuths(user.id)
    return {
      id: user.id,
      nickname: user.nickname,
      avatar: user.avatar,
      status: user.status,
      boundAuths,
    }
  }

  /**
   * 刷新 Token
   */
  @Post('refresh')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: '刷新 Token' })
  @ApiResponse({ status: 200, type: LoginResponseDto })
  async refreshToken(@CurrentUser() user: User): Promise<LoginResponseDto> {
    return this.authService.refreshToken(user.id)
  }
}
