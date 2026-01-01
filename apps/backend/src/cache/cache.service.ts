import { Injectable } from '@nestjs/common'

interface CacheEntry<T> {
  value: T
  expireAt: number | null
}

@Injectable()
export class CacheService {
  private cache: Map<string, CacheEntry<unknown>> = new Map()
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // 每分钟清理过期缓存
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000)
  }

  onModuleDestroy() {
    clearInterval(this.cleanupInterval)
  }

  // 获取缓存
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    // 检查是否过期
    if (entry.expireAt && Date.now() > entry.expireAt) {
      this.cache.delete(key)
      return null
    }

    return entry.value as T
  }

  // 设置缓存
  set<T>(key: string, value: T, ttlSeconds?: number): void {
    const expireAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null
    this.cache.set(key, { value, expireAt })
  }

  // 删除缓存
  del(key: string): void {
    this.cache.delete(key)
  }

  // 删除匹配前缀的所有缓存
  delByPrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key)
      }
    }
  }

  // 清理过期缓存
  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expireAt && now > entry.expireAt) {
        this.cache.delete(key)
      }
    }
  }

  // 缓存键（使用 userPhone 作为用户标识）
  static keys = {
    userRecords: (userPhone: string) => `user:${userPhone}:records`,
    userStats: (userPhone: string, dateRange: string) =>
      `user:${userPhone}:stats:${dateRange}`,
    syncVersion: (userPhone: string, deviceId: string) =>
      `sync:${userPhone}:${deviceId}`,
  }
}
