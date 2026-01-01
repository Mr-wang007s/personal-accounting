import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Inject,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { SyncService } from './sync.service'
import { BackupDto, DeleteCloudRecordsDto } from './dto/sync-push.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { User } from '@prisma/client'

@ApiTags('数据同步')
@Controller('sync')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SyncController {
  constructor(@Inject(SyncService) private readonly syncService: SyncService) {}

  @Post('backup')
  @ApiOperation({ summary: '备份：上传本地记录到云端' })
  async backup(
    @CurrentUser() user: User,
    @Body() dto: BackupDto,
  ) {
    return this.syncService.backup(user.id, dto)
  }

  @Get('restore')
  @ApiOperation({ summary: '恢复：从云端下载所有记录' })
  async restore(@CurrentUser() user: User) {
    return this.syncService.restore(user.id)
  }

  @Post('delete-cloud')
  @ApiOperation({ summary: '删除云端记录' })
  async deleteCloudRecords(
    @CurrentUser() user: User,
    @Body() dto: DeleteCloudRecordsDto,
  ) {
    return this.syncService.deleteCloudRecords(user.id, dto)
  }
}
