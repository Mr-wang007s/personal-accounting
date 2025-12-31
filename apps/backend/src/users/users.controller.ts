import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { UsersService } from './users.service'
import { UpdateUserDto } from './dto/update-user.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { User } from '@prisma/client'

@ApiTags('用户')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: '获取当前用户信息' })
  async getCurrentUser(@CurrentUser() user: User) {
    return {
      id: user.id,
      openid: user.openid,
      nickname: user.nickname,
      avatar: user.avatar,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  }

  @Put('me')
  @ApiOperation({ summary: '更新当前用户信息' })
  async updateCurrentUser(
    @CurrentUser() user: User,
    @Body() dto: UpdateUserDto,
  ) {
    const updated = await this.usersService.update(user.id, dto)
    return {
      id: updated.id,
      openid: updated.openid,
      nickname: updated.nickname,
      avatar: updated.avatar,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    }
  }

  @Get('me/stats')
  @ApiOperation({ summary: '获取当前用户统计信息' })
  async getCurrentUserStats(@CurrentUser() user: User) {
    return this.usersService.getUserStats(user.id)
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除当前用户账号' })
  async deleteCurrentUser(@CurrentUser() user: User) {
    await this.usersService.delete(user.id)
  }
}
