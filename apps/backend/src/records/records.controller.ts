import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger'
import { RecordsService } from './records.service'
import { CreateRecordDto } from './dto/create-record.dto'
import { UpdateRecordDto } from './dto/update-record.dto'
import { QueryRecordsDto } from './dto/query-records.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { User } from '@prisma/client'

@ApiTags('记账记录')
@Controller('records')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RecordsController {
  constructor(private readonly recordsService: RecordsService) {}

  /**
   * 获取记录列表
   */
  @Get()
  @ApiOperation({ summary: '获取记录列表' })
  async findAll(@CurrentUser() user: User, @Query() query: QueryRecordsDto) {
    return this.recordsService.findAll(user.id, query)
  }

  /**
   * 创建记录
   */
  @Post()
  @ApiOperation({ summary: '创建记账记录' })
  async create(@CurrentUser() user: User, @Body() dto: CreateRecordDto) {
    return this.recordsService.create(user.id, dto)
  }

  /**
   * 获取单条记录
   */
  @Get(':id')
  @ApiOperation({ summary: '获取单条记录' })
  async findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.recordsService.findOne(user.id, id)
  }

  /**
   * 更新记录
   */
  @Put(':id')
  @ApiOperation({ summary: '更新记录' })
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateRecordDto,
  ) {
    return this.recordsService.update(user.id, id, dto)
  }

  /**
   * 删除记录
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '删除记录' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async remove(@CurrentUser() user: User, @Param('id') id: string) {
    await this.recordsService.remove(user.id, id)
    return { deleted: true }
  }

  /**
   * 批量删除记录
   */
  @Post('batch-delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '批量删除记录' })
  async batchDelete(@CurrentUser() user: User, @Body('ids') ids: string[]) {
    const count = await this.recordsService.removeMany(user.id, ids)
    return { deleted: count }
  }
}
