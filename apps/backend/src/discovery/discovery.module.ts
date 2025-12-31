import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { DiscoveryService } from './discovery.service'
import { DiscoveryController } from './discovery.controller'

@Module({
  imports: [ConfigModule],
  providers: [DiscoveryService],
  controllers: [DiscoveryController],
  exports: [DiscoveryService],
})
export class DiscoveryModule {}
