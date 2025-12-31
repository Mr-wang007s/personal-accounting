import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { AppModule } from '../../src/app.module'
import { PrismaService } from '../../src/prisma/prisma.service'
import { MOCK_USER } from '../../src/auth/constants/mock-user'

/**
 * 创建测试应用实例
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile()

  const app = moduleFixture.createNestApplication()

  // 配置全局管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  await app.init()
  return app
}

/**
 * 获取 Prisma 服务
 */
export function getPrismaService(app: INestApplication): PrismaService {
  return app.get(PrismaService)
}

/**
 * 清理测试数据库
 */
export async function cleanDatabase(prisma: PrismaService): Promise<void> {
  // 按照外键依赖顺序删除
  await prisma.record.deleteMany()
  await prisma.syncVersion.deleteMany()
  await prisma.user.deleteMany()
}

/**
 * 创建测试用户（在数据库中）
 */
export async function createTestUser(prisma: PrismaService) {
  return prisma.user.upsert({
    where: { openid: MOCK_USER.openid },
    update: {},
    create: {
      id: MOCK_USER.id,
      openid: MOCK_USER.openid,
      nickname: MOCK_USER.nickname,
      avatar: MOCK_USER.avatar,
    },
  })
}

/**
 * Mock 记账数据
 */
export const mockRecordData = {
  expense: {
    type: 'expense',
    amount: 100.5,
    categoryId: 'food',
    date: new Date().toISOString(),
    note: '午餐',
  },
  income: {
    type: 'income',
    amount: 5000,
    categoryId: 'salary',
    date: new Date().toISOString(),
    note: '工资',
  },
}

/**
 * 获取 mock 用户信息
 */
export { MOCK_USER }
