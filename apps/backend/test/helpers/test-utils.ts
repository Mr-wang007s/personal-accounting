import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { AppModule } from '../../src/app.module'
import { PrismaService } from '../../src/prisma/prisma.service'
import { TransformInterceptor } from '../../src/common/interceptors/transform.interceptor'
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter'
import request from 'supertest'

// 测试用户数据
export const TEST_USER = {
  phone: '13800138001',
  nickname: 'Test User',
}

export const TEST_USER_2 = {
  phone: '13900139002',
  nickname: 'Test User 2',
}

/**
 * 创建测试应用实例
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile()

  const app = moduleFixture.createNestApplication()

  // 配置全局管道（与 main.ts 保持一致）
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  )

  // 配置全局拦截器和过滤器
  app.useGlobalInterceptors(new TransformInterceptor())
  app.useGlobalFilters(new HttpExceptionFilter())

  // 设置全局前缀
  app.setGlobalPrefix('api')

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
  await prisma.ledger.deleteMany()
  await prisma.user.deleteMany()
}

/**
 * 登录并获取 token
 */
export async function loginAndGetToken(
  app: INestApplication,
  phone: string = TEST_USER.phone,
  nickname?: string,
): Promise<{ token: string; user: any }> {
  const response = await request(app.getHttpServer())
    .post('/api/auth/phone/login')
    .send({ phone, nickname })

  return {
    token: response.body.data.accessToken,
    user: response.body.data.user,
  }
}

/**
 * 创建测试账本
 */
export async function createTestLedger(
  app: INestApplication,
  token: string,
  data: { clientId: string; name: string; icon?: string; color?: string },
) {
  const response = await request(app.getHttpServer())
    .post('/api/ledgers')
    .set('Authorization', `Bearer ${token}`)
    .send(data)

  return response.body.data
}

/**
 * 创建测试记录
 */
export async function createTestRecord(
  app: INestApplication,
  token: string,
  data: {
    type: 'income' | 'expense'
    amount: number
    category: string
    date: string
    ledgerId: string
    note?: string
    clientId?: string
  },
) {
  const response = await request(app.getHttpServer())
    .post('/api/records')
    .set('Authorization', `Bearer ${token}`)
    .send(data)

  return response.body.data
}

/**
 * 生成测试日期
 */
export function getTestDate(daysOffset: number = 0): string {
  const date = new Date()
  date.setDate(date.getDate() + daysOffset)
  return date.toISOString().split('T')[0]
}

/**
 * 生成唯一的 clientId
 */
export function generateClientId(prefix: string = 'test'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}
