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
  Inject,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger'
import { RecordsService } from './records.service'
import { CreateRecordDto } from './dto/create-record.dto'
import { UpdateRecordDto } from './dto/update-record.dto'
import { QueryRecordsDto } from './dto/query-records.dto'
import { StatisticsQueryDto } from './dto/statistics-query.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { User } from '@prisma/client'

@ApiTags('记账记录')
@Controller('records')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RecordsController {
  constructor(@Inject(RecordsService) private readonly recordsService: RecordsService) {}

  @Post()
  @ApiOperation({ summary: '创建记账记录' })
  async create(@CurrentUser() user: User, @Body() dto: CreateRecordDto) {
    // 使用 phone 作为稳定标识，用户注销重注册后数据不丢失
    const record = await this.recordsService.create(user.phone, dto)
    return {
      id: record.id,
      type: record.type,
      amount: Number(record.amount),
      category: record.category,
      date: record.date.toISOString().split('T')[0],
      note: record.note,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      ledgerId: record.ledgerId,
    }
  }

  @Get()
  @ApiOperation({ summary: '查询记账记录列表' })
  async findAll(@CurrentUser() user: User, @Query() query: QueryRecordsDto) {
    return this.recordsService.findAll(user.phone, query)
  }

  @Get('statistics')
  @ApiOperation({ summary: '获取统计数据' })
  async getStatistics(
    @CurrentUser() user: User,
    @Query() query: StatisticsQueryDto,
  ) {
    return this.recordsService.getStatistics(
      user.phone,
      query.startDate,
      query.endDate,
    )
  }

  @Get('monthly-trend')
  @ApiOperation({ summary: '获取月度趋势' })
  async getMonthlyTrend(
    @CurrentUser() user: User,
    @Query('year') year: number,
  ) {
    return this.recordsService.getMonthlyTrend(
      user.phone,
      year || new Date().getFullYear(),
    )
  }

  @Get('category-breakdown')
  @ApiOperation({ summary: '获取分类统计' })
  async getCategoryBreakdown(
    @CurrentUser() user: User,
    @Query('type') type: 'income' | 'expense',
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.recordsService.getCategoryBreakdown(
      user.phone,
      type,
      startDate,
      endDate,
    )
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单条记账记录' })
  async findOne(@CurrentUser() user: User, @Param('id') id: string) {
    const record = await this.recordsService.findOne(user.phone, id)
    return {
      id: record.id,
      type: record.type,
      amount: Number(record.amount),
      category: record.category,
      date: record.date.toISOString().split('T')[0],
      note: record.note,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      ledgerId: record.ledgerId,
    }
  }

  @Put(':id')
  @ApiOperation({ summary: '更新记账记录' })
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateRecordDto,
  ) {
    const record = await this.recordsService.update(user.phone, id, dto)
    return {
      id: record.id,
      type: record.type,
      amount: Number(record.amount),
      category: record.category,
      date: record.date.toISOString().split('T')[0],
      note: record.note,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      ledgerId: record.ledgerId,
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除记账记录' })
  async remove(@CurrentUser() user: User, @Param('id') id: string) {
    await this.recordsService.remove(user.phone, id)
  }

  @Post('batch-delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '批量删除记账记录' })
  async batchDelete(@CurrentUser() user: User, @Body('ids') ids: string[]) {
    const count = await this.recordsService.removeMany(user.phone, ids)
    return { deleted: count }
  }
}
