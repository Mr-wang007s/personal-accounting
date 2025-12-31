import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as dgram from 'dgram'
import * as os from 'os'

export interface ServiceInfo {
  name: string
  host: string
  port: number
  addresses: string[]
}

@Injectable()
export class DiscoveryService implements OnModuleInit, OnModuleDestroy {
  private socket: dgram.Socket | null = null
  private broadcastInterval: NodeJS.Timeout | null = null
  private readonly serviceName = 'personal-accounting'
  private readonly broadcastPort = 41234

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const enableDiscovery = this.configService.get('ENABLE_DISCOVERY', 'true')
    if (enableDiscovery === 'true') {
      await this.startBroadcast()
    }
  }

  onModuleDestroy() {
    this.stopBroadcast()
  }

  // 获取本机所有 IPv4 地址
  private getLocalAddresses(): string[] {
    const interfaces = os.networkInterfaces()
    const addresses: string[] = []

    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        // 跳过内部地址和 IPv6
        if (iface.family === 'IPv4' && !iface.internal) {
          addresses.push(iface.address)
        }
      }
    }

    return addresses
  }

  // 启动 UDP 广播
  private async startBroadcast() {
    try {
      this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true })

      this.socket.on('error', (err) => {
        console.warn('Discovery broadcast error:', err.message)
      })

      await new Promise<void>((resolve, reject) => {
        this.socket!.bind(() => {
          this.socket!.setBroadcast(true)
          resolve()
        })
        this.socket!.on('error', reject)
      })

      // 每 5 秒广播一次
      this.broadcastInterval = setInterval(() => {
        this.broadcast()
      }, 5000)

      // 立即广播一次
      this.broadcast()

      console.log('🔍 Service discovery enabled (UDP broadcast on port', this.broadcastPort, ')')
    } catch (err) {
      console.warn('Failed to start discovery broadcast:', (err as Error).message)
    }
  }

  // 停止广播
  private stopBroadcast() {
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval)
      this.broadcastInterval = null
    }
    if (this.socket) {
      this.socket.close()
      this.socket = null
    }
  }

  // 发送广播消息
  private broadcast() {
    if (!this.socket) return

    const port = this.configService.get('PORT', 3000)
    const addresses = this.getLocalAddresses()

    const serviceInfo: ServiceInfo = {
      name: this.serviceName,
      host: os.hostname(),
      port: Number(port),
      addresses,
    }

    const message = Buffer.from(JSON.stringify(serviceInfo))

    // 广播到所有子网
    for (const addr of addresses) {
      const parts = addr.split('.')
      const broadcastAddr = `${parts[0]}.${parts[1]}.${parts[2]}.255`

      this.socket.send(
        message,
        0,
        message.length,
        this.broadcastPort,
        broadcastAddr,
        (err) => {
          if (err) {
            console.warn('Broadcast error to', broadcastAddr, ':', err.message)
          }
        },
      )
    }
  }

  // 获取服务信息（供 API 调用）
  getServiceInfo(): ServiceInfo {
    const port = this.configService.get('PORT', 3000)
    return {
      name: this.serviceName,
      host: os.hostname(),
      port: Number(port),
      addresses: this.getLocalAddresses(),
    }
  }
}
