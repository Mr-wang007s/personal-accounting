import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['error'],
    })
  }

  async onModuleInit() {
    await this.$connect()
    
    // 启动时打印数据库统计信息
    await this.printDatabaseStats()
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }

  /**
   * 打印数据库统计信息
   */
  async printDatabaseStats() {
    try {
      const userCount = await this.user.count()
      const authCount = await this.userAuth.count()
      const ledgerCount = await this.ledger.count()
      const recordCount = await this.record.count()

      console.log('========== 数据库统计 ==========')
      console.log(`📊 DATABASE_URL: ${process.env.DATABASE_URL || 'NOT SET'}`)
      console.log(`👥 用户数量: ${userCount}`)
      console.log(`🔑 认证记录: ${authCount}`)
      console.log(`📒 账本数量: ${ledgerCount}`)
      console.log(`📝 记录数量: ${recordCount}`)
      
      // 打印最近的用户
      if (userCount > 0) {
        const recentUsers = await this.user.findMany({
          take: 3,
          orderBy: { createdAt: 'desc' },
          select: { id: true, nickname: true, status: true, createdAt: true },
        })
        console.log('📋 最近用户:', recentUsers.map(u => ({
          id: u.id.substring(0, 8) + '...',
          nickname: u.nickname,
          status: u.status,
        })))
      }
      
      console.log('================================')
    } catch (error) {
      console.error('❌ 数据库统计失败:', error)
    }
  }

  // 清理数据库（仅用于测试）
  async cleanDatabase() {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('cleanDatabase can only be called in test environment')
    }
    await this.record.deleteMany()
    await this.ledger.deleteMany()
    await this.userAuth.deleteMany()
    await this.user.deleteMany()
  }
}
