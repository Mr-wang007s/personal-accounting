import { Controller, Get, Post, Put, Body, Param, UseGuards, Req } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { LedgersService, CloudLedger } from './ledgers.service'
import { CreateLedgerDto, UpdateLedgerDto } from './dto/ledger.dto'

@ApiTags('ledgers')
@Controller('ledgers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LedgersController {
  constructor(private readonly ledgersService: LedgersService) {}

  @Post()
  @ApiOperation({ summary: '创建账本' })
  async create(@Req() req: any, @Body() dto: CreateLedgerDto): Promise<CloudLedger> {
    const userPhone = req.user.phone
    return this.ledgersService.create(userPhone, dto)
  }

  @Get()
  @ApiOperation({ summary: '获取所有账本' })
  async findAll(@Req() req: any): Promise<CloudLedger[]> {
    const userPhone = req.user.phone
    return this.ledgersService.findAll(userPhone)
  }

  @Get(':clientId')
  @ApiOperation({ summary: '获取单个账本' })
  async findOne(@Req() req: any, @Param('clientId') clientId: string): Promise<CloudLedger> {
    const userPhone = req.user.phone
    return this.ledgersService.findOne(userPhone, clientId)
  }

  @Put(':clientId')
  @ApiOperation({ summary: '更新账本' })
  async update(
    @Req() req: any,
    @Param('clientId') clientId: string,
    @Body() dto: UpdateLedgerDto,
  ): Promise<CloudLedger> {
    const userPhone = req.user.phone
    return this.ledgersService.update(userPhone, clientId, dto)
  }
}
