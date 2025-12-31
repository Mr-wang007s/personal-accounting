import { Controller, Get } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { DiscoveryService } from './discovery.service'
import { Public } from '../auth/decorators/public.decorator'

@ApiTags('服务发现')
@Controller('discovery')
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Get('info')
  @Public()
  @ApiOperation({ summary: '获取服务信息（无需认证）' })
  getServiceInfo() {
    return this.discoveryService.getServiceInfo()
  }

  @Get('ping')
  @Public()
  @ApiOperation({ summary: '健康检查（无需认证）' })
  ping() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      ...this.discoveryService.getServiceInfo(),
    }
  }
}
