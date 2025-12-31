import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Headers,
  Inject,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger'
import { SyncService } from './sync.service'
import { SyncPushDto } from './dto/sync-push.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { User } from '@prisma/client'

@ApiTags('数据同步')
@Controller('sync')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiHeader({ name: 'X-Device-Id', description: '设备唯一标识', required: true })
export class SyncController {
  constructor(@Inject(SyncService) private readonly syncService: SyncService) {}

  @Get('status')
  @ApiOperation({ summary: '获取同步状态' })
  async getSyncStatus(
    @CurrentUser() user: User,
    @Headers('x-device-id') deviceId: string,
  ) {
    return this.syncService.getSyncStatus(user.id, deviceId || 'default')
  }

  @Get('pull')
  @ApiOperation({ summary: '拉取增量数据' })
  async pull(
    @CurrentUser() user: User,
    @Headers('x-device-id') deviceId: string,
    @Query('lastSyncVersion') lastSyncVersion: number,
  ) {
    return this.syncService.pull(
      user.id,
      deviceId || 'default',
      lastSyncVersion || 0,
    )
  }

  @Post('push')
  @ApiOperation({ summary: '推送本地变更' })
  async push(
    @CurrentUser() user: User,
    @Headers('x-device-id') deviceId: string,
    @Body() dto: SyncPushDto,
  ) {
    return this.syncService.push(user.id, deviceId || 'default', dto)
  }

  @Get('full')
  @ApiOperation({ summary: '全量同步（首次同步或数据恢复）' })
  async fullSync(
    @CurrentUser() user: User,
    @Headers('x-device-id') deviceId: string,
  ) {
    return this.syncService.fullSync(user.id, deviceId || 'default')
  }
}
