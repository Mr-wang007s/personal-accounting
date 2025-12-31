import { Injectable, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis

  constructor(private configService: ConfigService) {
    this.client = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD') || undefined,
      retryStrategy: (times) => {
        if (times > 3) {
          console.warn('Redis connection failed, running without cache')
          return null
        }
        return Math.min(times * 100, 3000)
      },
    })

    this.client.on('error', (err) => {
      console.warn('Redis error:', err.message)
    })
  }

  async onModuleDestroy() {
    await this.client.quit()
  }

  // 获取 Redis 客户端
  getClient(): Redis {
    return this.client
  }

  // 缓存操作
  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key)
    } catch {
      return null
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      if (ttl) {
        await this.client.setex(key, ttl, value)
      } else {
        await this.client.set(key, value)
      }
    } catch {
      // 忽略缓存错误
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key)
    } catch {
      // 忽略缓存错误
    }
  }

  // JSON 缓存操作
  async getJson<T>(key: string): Promise<T | null> {
    const data = await this.get(key)
    if (!data) return null
    try {
      return JSON.parse(data) as T
    } catch {
      return null
    }
  }

  async setJson<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttl)
  }

  // 缓存键前缀
  static keys = {
    userRecords: (userId: string) => `user:${userId}:records`,
    userStats: (userId: string, dateRange: string) =>
      `user:${userId}:stats:${dateRange}`,
    syncVersion: (userId: string, deviceId: string) =>
      `sync:${userId}:${deviceId}`,
  }
}
