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
import { LoginResponseDto } from './dto/login-response.dto'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { CurrentUser } from './decorators/current-user.decorator'
import { User } from '@prisma/client'

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 手机号登录（暂未接入验证平台，只需手机号）
   */
  @Post('phone/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '手机号登录/注册' })
  @ApiResponse({ status: 200, type: LoginResponseDto })
  async phoneLogin(@Body() dto: PhoneLoginDto): Promise<LoginResponseDto> {
    return this.authService.phoneLogin(dto.phone, dto.nickname)
  }

  /**
   * 获取当前用户信息
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户信息' })
  async getMe(@CurrentUser() user: User) {
    return {
      id: user.id,
      phone: user.phone,
      openid: user.openid,
      nickname: user.nickname,
      avatar: user.avatar,
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
