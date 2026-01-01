import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import {
  createTestApp,
  getPrismaService,
  cleanDatabase,
  createTestUser,
  TEST_USER,
} from '../helpers/test-utils'
import { PrismaService } from '../../src/prisma/prisma.service'

describe('Auth E2E Tests', () => {
  let app: INestApplication
  let prisma: PrismaService
  let authToken: string

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

    it('should create user with nickname', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/dev/login')
        .send({ openid: 'test-openid-789', nickname: 'Test User' })
        .expect(200)

      expect(response.body.user.nickname).toBe('Test User')
    })
  })

  describe('GET /auth/profile', () => {
    beforeEach(async () => {
      // 先登录获取 token
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/dev/login')
        .send({ openid: TEST_USER.openid, nickname: TEST_USER.nickname })
      authToken = loginResponse.body.accessToken
    })

    it('should return user profile with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.openid).toBe(TEST_USER.openid)
      expect(response.body.nickname).toBe(TEST_USER.nickname)
    })

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .get('/auth/profile')
        .expect(401)
    })

    it('should return 401 with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401)
    })
  })

  describe('POST /auth/refresh', () => {
    beforeEach(async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/dev/login')
        .send({ openid: TEST_USER.openid })
      authToken = loginResponse.body.accessToken
    })

    it('should refresh token for authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('accessToken')
      expect(response.body.user.openid).toBe(TEST_USER.openid)
    })
  })
})
