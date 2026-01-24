import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import {
  createTestApp,
  getPrismaService,
  cleanDatabase,
  loginAndGetToken,
  createTestLedger,
  createTestRecord,
  generateClientId,
  getTestDate,
  TEST_USER,
  TEST_USER_2,
} from '../helpers/test-utils'
import { PrismaService } from '../../src/prisma/prisma.service'

describe('Ledgers E2E Tests', () => {
  let app: INestApplication
  let prisma: PrismaService
  let authToken: string
  let defaultLedgerId: string

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
    // 登录获取 token 和默认账本
    const { token } = await loginAndGetToken(app, TEST_USER.phone)
    authToken = token

    // 获取默认账本 ID
    const ledgersRes = await request(app.getHttpServer())
      .get('/api/ledgers')
      .set('Authorization', `Bearer ${authToken}`)

    defaultLedgerId = ledgersRes.body.data[0].id
  })

  // ============================================
  // GET /api/ledgers - 获取所有账本
  // ============================================
  describe('GET /api/ledgers', () => {
    describe('成功场景', () => {
      it('应返回用户所有账本', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/ledgers')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)

        expect(response.body.code).toBe(0)
        expect(Array.isArray(response.body.data)).toBe(true)
        expect(response.body.data.length).toBeGreaterThanOrEqual(1)
      })

      it('新用户应有一个默认账本', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/ledgers')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)

        expect(response.body.data).toHaveLength(1)
        expect(response.body.data[0].name).toBe('日常账本')
        expect(response.body.data[0]).toHaveProperty('id')
        expect(response.body.data[0]).toHaveProperty('createdAt')
        expect(response.body.data[0]).toHaveProperty('updatedAt')
      })

      it('账本应按创建时间升序排列', async () => {
        // 创建多个账本
        await createTestLedger(app, authToken, {
          clientId: generateClientId('ledger'),
          name: '账本A',
        })

        await createTestLedger(app, authToken, {
          clientId: generateClientId('ledger'),
          name: '账本B',
        })

        const response = await request(app.getHttpServer())
          .get('/api/ledgers')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)

        expect(response.body.data).toHaveLength(3) // 默认 + 2个新建
        // 验证顺序（默认账本最早创建）
        expect(response.body.data[0].name).toBe('日常账本')
      })
    })

    describe('失败场景', () => {
      it('无 token：应返回 401', async () => {
        await request(app.getHttpServer())
          .get('/api/ledgers')
          .expect(401)
      })
    })
  })

  // ============================================
  // POST /api/ledgers - 创建账本
  // ============================================
  describe('POST /api/ledgers', () => {
    describe('成功场景', () => {
      it('应成功创建账本', async () => {
        const clientId = generateClientId('ledger')

        const response = await request(app.getHttpServer())
          .post('/api/ledgers')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            clientId,
            name: '旅行账本',
            icon: '✈️',
            color: '#FF5722',
          })
          .expect(201)

        expect(response.body.code).toBe(0)
        expect(response.body.data.name).toBe('旅行账本')
        expect(response.body.data.icon).toBe('✈️')
        expect(response.body.data.color).toBe('#FF5722')
        expect(response.body.data).toHaveProperty('id')
      })

      it('应支持只传必填字段', async () => {
        const clientId = generateClientId('ledger')

        const response = await request(app.getHttpServer())
          .post('/api/ledgers')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            clientId,
            name: '简单账本',
          })
          .expect(201)

        expect(response.body.data.name).toBe('简单账本')
        expect(response.body.data.icon).toBeUndefined()
        expect(response.body.data.color).toBeUndefined()
      })

      it('幂等性：相同 clientId 应更新而不是创建', async () => {
        const clientId = generateClientId('ledger')

        // 第一次创建
        const firstRes = await request(app.getHttpServer())
          .post('/api/ledgers')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            clientId,
            name: '原始名称',
          })
          .expect(201)

        // 第二次用相同 clientId 创建
        const secondRes = await request(app.getHttpServer())
          .post('/api/ledgers')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            clientId,
            name: '更新后名称',
            icon: '📝',
          })
          .expect(201)

        expect(secondRes.body.data.id).toBe(firstRes.body.data.id)
        expect(secondRes.body.data.name).toBe('更新后名称')
        expect(secondRes.body.data.icon).toBe('📝')

        // 验证总数没变
        const ledgersRes = await request(app.getHttpServer())
          .get('/api/ledgers')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)

        expect(ledgersRes.body.data).toHaveLength(2) // 默认 + 1
      })

      it('支持 emoji 图标', async () => {
        const emojis = ['📒', '💰', '🏠', '🚗', '🎮', '🍔', '✈️', '🎁']

        for (const emoji of emojis) {
          const response = await request(app.getHttpServer())
            .post('/api/ledgers')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              clientId: generateClientId('ledger'),
              name: `${emoji}账本`,
              icon: emoji,
            })
            .expect(201)

          expect(response.body.data.icon).toBe(emoji)
        }
      })
    })

    describe('失败场景', () => {
      it('缺少 clientId：应返回 400', async () => {
        await request(app.getHttpServer())
          .post('/api/ledgers')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: '测试账本',
          })
          .expect(400)
      })

      it('缺少 name：应返回 400', async () => {
        await request(app.getHttpServer())
          .post('/api/ledgers')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            clientId: generateClientId('ledger'),
          })
          .expect(400)
      })

      it('name 为空字符串：应返回 400', async () => {
        await request(app.getHttpServer())
          .post('/api/ledgers')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            clientId: generateClientId('ledger'),
            name: '',
          })
          .expect(400)
      })

      it('无 token：应返回 401', async () => {
        await request(app.getHttpServer())
          .post('/api/ledgers')
          .send({
            clientId: generateClientId('ledger'),
            name: '测试账本',
          })
          .expect(401)
      })
    })
  })

  // ============================================
  // PUT /api/ledgers/:id - 更新账本
  // ============================================
  describe('PUT /api/ledgers/:id', () => {
    let testLedgerId: string
    let testLedgerClientId: string

    beforeEach(async () => {
      testLedgerClientId = generateClientId('ledger')
      const ledger = await createTestLedger(app, authToken, {
        clientId: testLedgerClientId,
        name: '测试账本',
        icon: '📒',
        color: '#000000',
      })
      testLedgerId = ledger.id
    })

    describe('成功场景', () => {
      it('应成功更新账本名称', async () => {
        const response = await request(app.getHttpServer())
          .put(`/api/ledgers/${testLedgerId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: '新名称' })
          .expect(200)

        expect(response.body.code).toBe(0)
        expect(response.body.data.name).toBe('新名称')
        expect(response.body.data.icon).toBe('📒') // 未修改的字段保持不变
      })

      it('应成功更新账本图标', async () => {
        const response = await request(app.getHttpServer())
          .put(`/api/ledgers/${testLedgerId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ icon: '💰' })
          .expect(200)

        expect(response.body.data.icon).toBe('💰')
        expect(response.body.data.name).toBe('测试账本') // 未修改的字段保持不变
      })

      it('应成功更新账本颜色', async () => {
        const response = await request(app.getHttpServer())
          .put(`/api/ledgers/${testLedgerId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ color: '#FF0000' })
          .expect(200)

        expect(response.body.data.color).toBe('#FF0000')
      })

      it('应成功同时更新多个字段', async () => {
        const response = await request(app.getHttpServer())
          .put(`/api/ledgers/${testLedgerId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: '全新账本',
            icon: '🎉',
            color: '#00FF00',
          })
          .expect(200)

        expect(response.body.data.name).toBe('全新账本')
        expect(response.body.data.icon).toBe('🎉')
        expect(response.body.data.color).toBe('#00FF00')
      })

      it('应支持通过 clientId 更新', async () => {
        const response = await request(app.getHttpServer())
          .put(`/api/ledgers/${testLedgerClientId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: '通过clientId更新' })
          .expect(200)

        expect(response.body.data.name).toBe('通过clientId更新')
      })
    })

    describe('失败场景', () => {
      it('账本不存在：应返回 404', async () => {
        await request(app.getHttpServer())
          .put('/api/ledgers/non-existent-id')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: '新名称' })
          .expect(404)
      })

      it('无 token：应返回 401', async () => {
        await request(app.getHttpServer())
          .put(`/api/ledgers/${testLedgerId}`)
          .send({ name: '新名称' })
          .expect(401)
      })

      it('其他用户的账本：应返回 404', async () => {
        // 用户2登录
        const { token: token2 } = await loginAndGetToken(app, TEST_USER_2.phone)

        // 尝试更新用户1的账本
        await request(app.getHttpServer())
          .put(`/api/ledgers/${testLedgerId}`)
          .set('Authorization', `Bearer ${token2}`)
          .send({ name: '新名称' })
          .expect(404)
      })
    })
  })

  // ============================================
  // DELETE /api/ledgers/:id - 删除账本
  // ============================================
  describe('DELETE /api/ledgers/:id', () => {
    let testLedgerId: string

    beforeEach(async () => {
      const ledger = await createTestLedger(app, authToken, {
        clientId: generateClientId('ledger'),
        name: '待删除账本',
      })
      testLedgerId = ledger.id
    })

    describe('成功场景', () => {
      it('应成功删除空账本', async () => {
        const response = await request(app.getHttpServer())
          .delete(`/api/ledgers/${testLedgerId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)

        expect(response.body.code).toBe(0)
        expect(response.body.data.deleted).toBe(true)

        // 验证已删除
        const ledgersRes = await request(app.getHttpServer())
          .get('/api/ledgers')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)

        const deletedLedger = ledgersRes.body.data.find((l: any) => l.id === testLedgerId)
        expect(deletedLedger).toBeUndefined()
      })

      it('删除后记录数应减少', async () => {
        // 获取删除前的账本数
        const beforeRes = await request(app.getHttpServer())
          .get('/api/ledgers')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)

        const beforeCount = beforeRes.body.data.length

        // 删除账本
        await request(app.getHttpServer())
          .delete(`/api/ledgers/${testLedgerId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)

        // 获取删除后的账本数
        const afterRes = await request(app.getHttpServer())
          .get('/api/ledgers')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)

        expect(afterRes.body.data.length).toBe(beforeCount - 1)
      })
    })

    describe('失败场景', () => {
      it('账本下有记录：应返回 400', async () => {
        // 在账本下创建一条记录
        await createTestRecord(app, authToken, {
          type: 'expense',
          amount: 100,
          category: 'food',
          date: getTestDate(),
          ledgerId: testLedgerId,
        })

        // 尝试删除账本
        const response = await request(app.getHttpServer())
          .delete(`/api/ledgers/${testLedgerId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400)

        expect(response.body.message).toContain('记录')
      })

      it('账本不存在：应返回 404', async () => {
        await request(app.getHttpServer())
          .delete('/api/ledgers/non-existent-id')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404)
      })

      it('无 token：应返回 401', async () => {
        await request(app.getHttpServer())
          .delete(`/api/ledgers/${testLedgerId}`)
          .expect(401)
      })

      it('其他用户的账本：应返回 404', async () => {
        const { token: token2 } = await loginAndGetToken(app, TEST_USER_2.phone)

        await request(app.getHttpServer())
          .delete(`/api/ledgers/${testLedgerId}`)
          .set('Authorization', `Bearer ${token2}`)
          .expect(404)
      })
    })
  })

  // ============================================
  // 用户数据隔离测试
  // ============================================
  describe('用户数据隔离', () => {
    it('用户只能看到自己的账本', async () => {
      // 用户1创建账本
      await createTestLedger(app, authToken, {
        clientId: generateClientId('ledger'),
        name: '用户1的私人账本',
      })

      // 用户2登录
      const { token: token2 } = await loginAndGetToken(app, TEST_USER_2.phone)

      // 用户2查看账本列表
      const response = await request(app.getHttpServer())
        .get('/api/ledgers')
        .set('Authorization', `Bearer ${token2}`)
        .expect(200)

      // 用户2应该只能看到自己的默认账本
      expect(response.body.data).toHaveLength(1)
      expect(response.body.data[0].name).toBe('日常账本')
    })

    it('用户不能更新其他用户的账本', async () => {
      const ledger = await createTestLedger(app, authToken, {
        clientId: generateClientId('ledger'),
        name: '用户1的账本',
      })

      const { token: token2 } = await loginAndGetToken(app, TEST_USER_2.phone)

      await request(app.getHttpServer())
        .put(`/api/ledgers/${ledger.id}`)
        .set('Authorization', `Bearer ${token2}`)
        .send({ name: '尝试修改' })
        .expect(404)
    })

    it('用户不能删除其他用户的账本', async () => {
      const ledger = await createTestLedger(app, authToken, {
        clientId: generateClientId('ledger'),
        name: '用户1的账本',
      })

      const { token: token2 } = await loginAndGetToken(app, TEST_USER_2.phone)

      await request(app.getHttpServer())
        .delete(`/api/ledgers/${ledger.id}`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(404)
    })
  })
})
