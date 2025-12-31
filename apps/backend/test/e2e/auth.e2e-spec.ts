import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import {
  createTestApp,
  getPrismaService,
  cleanDatabase,
  createTestUser,
  MOCK_USER,
} from '../helpers/test-utils'
import { PrismaService } from '../../src/prisma/prisma.service'

describe('Auth E2E Tests', () => {
  let app: INestApplication
  let prisma: PrismaService

  beforeAll(async () => {
    app = await createTestApp()
    prisma = getPrismaService(app)
  })

  afterAll(async () => {
    await cleanDatabase(prisma)
    await app.close()
  })

  beforeEach(async () => {
    await cleanDatabase(prisma)
  })

  describe('GET /auth/profile', () => {
    it('should return mock user profile when SKIP_AUTH is enabled', async () => {
      // 创建测试用户（因为 mock user 需要在数据库中存在）
      await createTestUser(prisma)

      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .expect(200)

      expect(response.body).toMatchObject({
        id: MOCK_USER.id,
        openid: MOCK_USER.openid,
        nickname: MOCK_USER.nickname,
      })
    })
  })

  describe('POST /auth/dev/login', () => {
    it('should create and return user with token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/dev/login')
        .send({ openid: 'test-openid-123' })
        .expect(200)

      expect(response.body).toHaveProperty('accessToken')
      expect(response.body).toHaveProperty('user')
      expect(response.body.user.openid).toBe('test-openid-123')
    })

    it('should return existing user if openid exists', async () => {
      // 第一次登录
      const firstResponse = await request(app.getHttpServer())
        .post('/auth/dev/login')
        .send({ openid: 'test-openid-456' })
        .expect(200)

      // 第二次登录
      const secondResponse = await request(app.getHttpServer())
        .post('/auth/dev/login')
        .send({ openid: 'test-openid-456' })
        .expect(200)

      expect(firstResponse.body.user.id).toBe(secondResponse.body.user.id)
    })
  })

  describe('POST /auth/refresh', () => {
    it('should refresh token for authenticated user', async () => {
      await createTestUser(prisma)

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .expect(200)

      expect(response.body).toHaveProperty('accessToken')
      expect(response.body.user.id).toBe(MOCK_USER.id)
    })
  })
})
