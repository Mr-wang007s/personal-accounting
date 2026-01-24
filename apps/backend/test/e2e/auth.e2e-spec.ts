import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import {
  createTestApp,
  getPrismaService,
  cleanDatabase,
  loginAndGetToken,
  TEST_USER,
  TEST_USER_2,
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

  // ============================================
  // POST /api/auth/phone/login - 手机号登录
  // ============================================
  describe('POST /api/auth/phone/login', () => {
    describe('成功场景', () => {
      it('新用户登录：应创建用户并返回 token', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/auth/phone/login')
          .send({ phone: '13800138000' })
          .expect(200)

        expect(response.body.code).toBe(0)
        expect(response.body.data).toHaveProperty('accessToken')
        expect(response.body.data).toHaveProperty('user')
        expect(response.body.data.user.phone).toBe('13800138000')
        expect(response.body.data.isNewUser).toBe(true)
      })

      it('新用户登录：应自动创建默认账本', async () => {
        const loginRes = await request(app.getHttpServer())
          .post('/api/auth/phone/login')
          .send({ phone: '13800138000' })
          .expect(200)

        const token = loginRes.body.data.accessToken

        // 验证默认账本已创建
        const ledgersRes = await request(app.getHttpServer())
          .get('/api/ledgers')
          .set('Authorization', `Bearer ${token}`)
          .expect(200)

        expect(ledgersRes.body.data).toHaveLength(1)
        expect(ledgersRes.body.data[0].name).toBe('日常账本')
        expect(ledgersRes.body.data[0].icon).toBe('📒')
      })

      it('新用户登录：应自动生成默认昵称', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/auth/phone/login')
          .send({ phone: '13812345678' })
          .expect(200)

        expect(response.body.data.user.nickname).toBe('用户5678')
      })

      it('新用户登录：可以指定昵称', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/auth/phone/login')
          .send({ phone: '13800138000', nickname: '张三' })
          .expect(200)

        expect(response.body.data.user.nickname).toBe('张三')
      })

      it('老用户登录：应返回已有用户信息', async () => {
        // 第一次登录（注册）
        const firstRes = await request(app.getHttpServer())
          .post('/api/auth/phone/login')
          .send({ phone: TEST_USER.phone, nickname: TEST_USER.nickname })
          .expect(200)

        expect(firstRes.body.data.isNewUser).toBe(true)

        // 第二次登录
        const secondRes = await request(app.getHttpServer())
          .post('/api/auth/phone/login')
          .send({ phone: TEST_USER.phone })
          .expect(200)

        expect(secondRes.body.data.isNewUser).toBe(false)
        expect(secondRes.body.data.user.id).toBe(firstRes.body.data.user.id)
        expect(secondRes.body.data.user.nickname).toBe(TEST_USER.nickname)
      })

      it('老用户登录：不会重复创建默认账本', async () => {
        // 第一次登录
        const firstRes = await request(app.getHttpServer())
          .post('/api/auth/phone/login')
          .send({ phone: TEST_USER.phone })
          .expect(200)

        // 第二次登录
        await request(app.getHttpServer())
          .post('/api/auth/phone/login')
          .send({ phone: TEST_USER.phone })
          .expect(200)

        // 验证只有一个账本
        const ledgersRes = await request(app.getHttpServer())
          .get('/api/ledgers')
          .set('Authorization', `Bearer ${firstRes.body.data.accessToken}`)
          .expect(200)

        expect(ledgersRes.body.data).toHaveLength(1)
      })
    })

    describe('失败场景', () => {
      it('手机号为空：应返回 400', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/auth/phone/login')
          .send({})
          .expect(400)

        expect(response.body.code).not.toBe(0)
      })

      it('手机号格式无效（非11位）：应返回 400', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/auth/phone/login')
          .send({ phone: '1380013800' }) // 10位
          .expect(400)

        expect(response.body.code).not.toBe(0)
      })

      it('手机号格式无效（非数字开头）：应返回 400', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/auth/phone/login')
          .send({ phone: '23800138000' }) // 非1开头
          .expect(400)

        expect(response.body.code).not.toBe(0)
      })

      it('手机号格式无效（包含字母）：应返回 400', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/auth/phone/login')
          .send({ phone: '1380013800a' })
          .expect(400)

        expect(response.body.code).not.toBe(0)
      })
    })
  })

  // ============================================
  // GET /api/auth/me - 获取当前用户信息
  // ============================================
  describe('GET /api/auth/me', () => {
    describe('成功场景', () => {
      it('有效 token：应返回用户信息', async () => {
        const { token } = await loginAndGetToken(app, TEST_USER.phone, TEST_USER.nickname)

        const response = await request(app.getHttpServer())
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`)
          .expect(200)

        expect(response.body.code).toBe(0)
        expect(response.body.data.phone).toBe(TEST_USER.phone)
        expect(response.body.data.nickname).toBe(TEST_USER.nickname)
        expect(response.body.data).toHaveProperty('id')
      })
    })

    describe('失败场景', () => {
      it('无 token：应返回 401', async () => {
        await request(app.getHttpServer())
          .get('/api/auth/me')
          .expect(401)
      })

      it('无效 token：应返回 401', async () => {
        await request(app.getHttpServer())
          .get('/api/auth/me')
          .set('Authorization', 'Bearer invalid-token')
          .expect(401)
      })

      it('格式错误的 Authorization：应返回 401', async () => {
        const { token } = await loginAndGetToken(app)

        await request(app.getHttpServer())
          .get('/api/auth/me')
          .set('Authorization', token) // 缺少 Bearer 前缀
          .expect(401)
      })

      it('过期 token：应返回 401', async () => {
        // 使用一个明确过期的 token（手动构造）
        const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0IiwicGhvbmUiOiIxMzgwMDEzODAwMCIsImlhdCI6MTYwMDAwMDAwMCwiZXhwIjoxNjAwMDAwMDAxfQ.invalid'

        await request(app.getHttpServer())
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${expiredToken}`)
          .expect(401)
      })
    })
  })

  // ============================================
  // POST /api/auth/refresh - 刷新 Token
  // ============================================
  describe('POST /api/auth/refresh', () => {
    describe('成功场景', () => {
      it('有效 token：应返回新的 token', async () => {
        const { token } = await loginAndGetToken(app, TEST_USER.phone)

        const response = await request(app.getHttpServer())
          .post('/api/auth/refresh')
          .set('Authorization', `Bearer ${token}`)
          .expect(200)

        expect(response.body.code).toBe(0)
        expect(response.body.data).toHaveProperty('accessToken')
        expect(response.body.data.user.phone).toBe(TEST_USER.phone)
        expect(response.body.data.isNewUser).toBe(false)
      })

      it('刷新后的 token 应该可用', async () => {
        const { token } = await loginAndGetToken(app, TEST_USER.phone)

        const refreshRes = await request(app.getHttpServer())
          .post('/api/auth/refresh')
          .set('Authorization', `Bearer ${token}`)
          .expect(200)

        const newToken = refreshRes.body.data.accessToken

        // 使用新 token 访问
        const meRes = await request(app.getHttpServer())
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${newToken}`)
          .expect(200)

        expect(meRes.body.data.phone).toBe(TEST_USER.phone)
      })
    })

    describe('失败场景', () => {
      it('无 token：应返回 401', async () => {
        await request(app.getHttpServer())
          .post('/api/auth/refresh')
          .expect(401)
      })

      it('无效 token：应返回 401', async () => {
        await request(app.getHttpServer())
          .post('/api/auth/refresh')
          .set('Authorization', 'Bearer invalid-token')
          .expect(401)
      })
    })
  })

  // ============================================
  // 用户隔离测试
  // ============================================
  describe('用户数据隔离', () => {
    it('不同用户的数据应该完全隔离', async () => {
      // 用户1 登录
      const { token: token1 } = await loginAndGetToken(app, TEST_USER.phone, 'User1')

      // 用户2 登录
      const { token: token2 } = await loginAndGetToken(app, TEST_USER_2.phone, 'User2')

      // 用户1 创建账本
      await request(app.getHttpServer())
        .post('/api/ledgers')
        .set('Authorization', `Bearer ${token1}`)
        .send({ clientId: 'ledger_user1', name: '用户1的账本' })
        .expect(201)

      // 用户2 查看账本，应该只能看到默认账本
      const user2Ledgers = await request(app.getHttpServer())
        .get('/api/ledgers')
        .set('Authorization', `Bearer ${token2}`)
        .expect(200)

      expect(user2Ledgers.body.data).toHaveLength(1)
      expect(user2Ledgers.body.data[0].name).toBe('日常账本')
    })
  })
})
