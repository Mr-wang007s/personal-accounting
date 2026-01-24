import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { User } from '@prisma/client'
import { LedgersService } from './ledgers.service'
import { CreateLedgerDto, UpdateLedgerDto } from './dto/ledger.dto'

@ApiTags('账本')
@Controller('ledgers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LedgersController {
  constructor(private readonly ledgersService: LedgersService) {}

  /**
   * 获取所有账本
   */
  @Get()
  @ApiOperation({ summary: '获取所有账本' })
  async findAll(@CurrentUser() user: User) {
    return this.ledgersService.findAll(user.id)
  }

  /**
   * 创建账本
   */
  @Post()
  @ApiOperation({ summary: '创建账本' })
  async create(@CurrentUser() user: User, @Body() dto: CreateLedgerDto) {
    return this.ledgersService.create(user.id, dto)
  }

  /**
   * 更新账本
   */
  @Put(':id')
  @ApiOperation({ summary: '更新账本' })
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateLedgerDto,
  ) {
    return this.ledgersService.update(user.id, id, dto)
  }

  /**
   * 删除账本
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '删除账本' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async remove(@CurrentUser() user: User, @Param('id') id: string) {
    await this.ledgersService.remove(user.id, id)
    return { deleted: true }
  }
}
