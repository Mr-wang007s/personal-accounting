import { Module } from '@nestjs/common'
import { SyncService } from './sync.service'
import { SyncController } from './sync.controller'
import { RecordsModule } from '../records/records.module'

@Module({
  imports: [RecordsModule],
  controllers: [SyncController],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
