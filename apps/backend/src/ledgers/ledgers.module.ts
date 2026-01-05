import { Module } from '@nestjs/common'
import { LedgersController } from './ledgers.controller'
import { LedgersService } from './ledgers.service'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [LedgersController],
  providers: [LedgersService],
  exports: [LedgersService],
})
export class LedgersModule {}
