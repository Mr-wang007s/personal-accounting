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

describe('Records E2E Tests', () => {
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
    const { token } = await loginAndGetToken(app, TEST_USER.phone)
    authToken = token

    // 获取默认账本 ID
    const ledgersRes = await request(app.getHttpServer())
      .get('/api/ledgers')
      .set('Authorization', `Bearer ${authToken}`)

    defaultLedgerId = ledgersRes.body.data[0].id
  })

  // ============================================
  // GET /api/records - 获取记录列表
  // ============================================
  describe('GET /api/records', () => {
    describe('成功场景', () => {
      it('空账本应返回空数组', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/records')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)

        expect(response.body.code).toBe(0)
        expect(Array.isArray(response.body.data)).toBe(true)
        expect(response.body.data).toHaveLength(0)
      })

      it('应返回用户所有记录', async () => {
        // 创建多条记录
        await createTestRecord(app, authToken, {
          type: 'expense',
          amount: 100,
          category: 'food',
          date: getTestDate(),
          ledgerId: defaultLedgerId,
        })

        await createTestRecord(app, authToken, {
          type: 'income',
          amount: 5000,
          category: 'salary',
          date: getTestDate(),
          ledgerId: defaultLedgerId,
        })

        const response = await request(app.getHttpServer())
          .get('/api/records')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)

        expect(response.body.data).toHaveLength(2)
      })

      it('应按日期降序排列', async () => {
        await createTestRecord(app, authToken, {
          type: 'expense',
          amount: 100,
          category: 'food',
          date: getTestDate(-2), // 2天前
          ledgerId: defaultLedgerId,
        })

        await createTestRecord(app, authToken, {
          type: 'expense',
          amount: 200,
          category: 'food',
          date: getTestDate(), // 今天
          ledgerId: defaultLedgerId,
        })

        const response = await request(app.getHttpServer())
          .get('/api/records')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)

        expect(response.body.data[0].amount).toBe(200) // 今天的在前
        expect(response.body.data[1].amount).toBe(100) // 2天前的在后
      })

      it('应支持按账本筛选', async () => {
        // 创建新账本
        const newLedger = await createTestLedger(app, authToken, {
          clientId: generateClientId('ledger'),
          name: '新账本',
        })

        // 在默认账本创建记录
        await createTestRecord(app, authToken, {
          type: 'expense',
          amount: 100,
          category: 'food',
          date: getTestDate(),
          ledgerId: defaultLedgerId,
        })

        // 在新账本创建记录
        await createTestRecord(app, authToken, {
          type: 'expense',
          amount: 200,
          category: 'transport',
          date: getTestDate(),
          ledgerId: newLedger.id,
        })

        // 只查询新账本的记录
        const response = await request(app.getHttpServer())
          .get('/api/records')
          .query({ ledgerId: newLedger.id })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)

        expect(response.body.data).toHaveLength(1)
        expect(response.body.data[0].amount).toBe(200)
        expect(response.body.data[0].ledgerId).toBe(newLedger.id)
      })

      it('应支持按类型筛选 - expense', async () => {
        await createTestRecord(app, authToken, {
          type: 'expense',
          amount: 100,
          category: 'food',
          date: getTestDate(),
          ledgerId: defaultLedgerId,
        })

        await createTestRecord(app, authToken, {
          type: 'income',
          amount: 5000,
          category: 'salary',
          date: getTestDate(),
          ledgerId: defaultLedgerId,
        })

        const response = await request(app.getHttpServer())
          .get('/api/records')
          .query({ type: 'expense' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)

        expect(response.body.data).toHaveLength(1)
        expect(response.body.data[0].type).toBe('expense')
      })

      it('应支持按类型筛选 - income', async () => {
        await createTestRecord(app, authToken, {
          type: 'expense',
          amount: 100,
          category: 'food',
          date: getTestDate(),
          ledgerId: defaultLedgerId,
        })

        await createTestRecord(app, authToken, {
          type: 'income',
          amount: 5000,
          category: 'salary',
          date: getTestDate(),
          ledgerId: defaultLedgerId,
        })

        const response = await request(app.getHttpServer())
          .get('/api/records')
          .query({ type: 'income' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)

        expect(response.body.data).toHaveLength(1)
        expect(response.body.data[0].type).toBe('income')
      })

      it('应支持按分类筛选', async () => {
        await createTestRecord(app, authToken, {
          type: 'expense',
          amount: 100,
          category: 'food',
          date: getTestDate(),
          ledgerId: defaultLedgerId,
        })

        await createTestRecord(app, authToken, {
          type: 'expense',
          amount: 50,
          category: 'transport',
          date: getTestDate(),
          ledgerId: defaultLedgerId,
        })

        const response = await request(app.getHttpServer())
          .get('/api/records')
          .query({ category: 'food' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)

        expect(response.body.data).toHaveLength(1)
        expect(response.body.data[0].category).toBe('food')
      })

      it('应支持按日期范围筛选', async () => {
        await createTestRecord(app, authToken, {
          type: 'expense',
          amount: 100,
          category: 'food',
          date: getTestDate(-10), // 10天前
          ledgerId: defaultLedgerId,
        })

        await createTestRecord(app, authToken, {
          type: 'expense',
          amount: 200,
          category: 'food',
          date: getTestDate(-5), // 5天前
          ledgerId: defaultLedgerId,
        })

        await createTestRecord(app, authToken, {
          type: 'expense',
          amount: 300,
          category: 'food',
          date: getTestDate(), // 今天
          ledgerId: defaultLedgerId,
        })

        const response = await request(app.getHttpServer())
          .get('/api/records')
          .query({
            startDate: getTestDate(-7),
            endDate: getTestDate(-1),
          })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)

        expect(response.body.data).toHaveLength(1)
        expect(response.body.data[0].amount).toBe(200)
      })

      it('应支持组合筛选条件', async () => {
        // 创建新账本
        const newLedger = await createTestLedger(app, authToken, {
          clientId: generateClientId('ledger'),
          name: '新账本',
        })

        // 创建多条记录
        await createTestRecord(app, authToken, {
          type: 'expense',
          amount: 100,
          category: 'food',
          date: getTestDate(),
          ledgerId: defaultLedgerId,
        })

        await createTestRecord(app, authToken, {
          type: 'expense',
          amount: 200,
          category: 'food',
          date: getTestDate(),
          ledgerId: newLedger.id,
        })

        await createTestRecord(app, authToken, {
          type: 'income',
          amount: 5000,
          category: 'salary',
          date: getTestDate(),
          ledgerId: newLedger.id,
        })

        // 组合筛选：新账本 + 支出 + food
        const response = await request(app.getHttpServer())
          .get('/api/records')
          .query({
            ledgerId: newLedger.id,
            type: 'expense',
            category: 'food',
          })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)

        expect(response.body.data).toHaveLength(1)
        expect(response.body.data[0].amount).toBe(200)
      })
    })

    describe('失败场景', () => {
      it('无 token：应返回 401', async () => {
        await request(app.getHttpServer())
          .get('/api/records')
          .expect(401)
      })
    })
  })

  // ============================================
  // POST /api/records - 创建记录
  // ============================================
  describe('POST /api/records', () => {
    describe('成功场景', () => {
      it('应成功创建支出记录', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/records')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            type: 'expense',
            amount: 25.5,
            category: 'food',
            date: getTestDate(),
            note: '午餐',
            ledgerId: defaultLedgerId,
          })
          .expect(201)

        expect(response.body.code).toBe(0)
        expect(response.body.data.type).toBe('expense')
        expect(response.body.data.amount).toBe(25.5)
        expect(response.body.data.category).toBe('food')
        expect(response.body.data.note).toBe('午餐')
        expect(response.body.data.ledgerId).toBe(defaultLedgerId)
        expect(response.body.data).toHaveProperty('id')
        expect(response.body.data).toHaveProperty('createdAt')
        expect(response.body.data).toHaveProperty('updatedAt')
      })

      it('应成功创建收入记录', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/records')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            type: 'income',
            amount: 10000,
            category: 'salary',
            date: getTestDate(),
            note: '月工资',
            ledgerId: defaultLedgerId,
          })
          .expect(201)

        expect(response.body.data.type).toBe('income')
        expect(response.body.data.amount).toBe(10000)
      })

      it('应支持不带备注', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/records')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            type: 'expense',
            amount: 100,
            category: 'food',
            date: getTestDate(),
            ledgerId: defaultLedgerId,
          })
          .expect(201)

        expect(response.body.data.note).toBeUndefined()
      })

      it('应支持小数金额', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/records')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            type: 'expense',
            amount: 0.01,
            category: 'food',
            date: getTestDate(),
            ledgerId: defaultLedgerId,
          })
          .expect(201)

        expect(response.body.data.amount).toBe(0.01)
      })

      it('应支持大金额', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/records')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            type: 'income',
            amount: 9999999.99,
            category: 'salary',
            date: getTestDate(),
            ledgerId: defaultLedgerId,
          })
          .expect(201)

        expect(response.body.data.amount).toBe(9999999.99)
      })

      it('幂等性：相同 clientId 应更新而不是创建', async () => {
        const clientId = generateClientId('record')

        // 第一次创建
        const firstRes = await request(app.getHttpServer())
          .post('/api/records')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            type: 'expense',
            amount: 100,
            category: 'food',
            date: getTestDate(),
            ledgerId: defaultLedgerId,
            clientId,
          })
          .expect(201)

        // 第二次用相同 clientId 创建
        const secondRes = await request(app.getHttpServer())
          .post('/api/records')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            type: 'expense',
            amount: 200, // 修改金额
            category: 'transport', // 修改分类
            date: getTestDate(),
            ledgerId: defaultLedgerId,
            clientId,
          })
          .expect(201)

        expect(secondRes.body.data.id).toBe(firstRes.body.data.id)
        expect(secondRes.body.data.amount).toBe(200)
        expect(secondRes.body.data.category).toBe('transport')

        // 验证总数没变
        const recordsRes = await request(app.getHttpServer())
          .get('/api/records')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)

        expect(recordsRes.body.data).toHaveLength(1)
      })
    })

    describe('失败场景', () => {
      it('缺少 type：应返回 400', async () => {
        await request(app.getHttpServer())
          .post('/api/records')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            amount: 100,
            category: 'food',
            date: getTestDate(),
            ledgerId: defaultLedgerId,
          })
          .expect(400)
      })

      it('无效的 type：应返回 400', async () => {
        await request(app.getHttpServer())
          .post('/api/records')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            type: 'invalid',
            amount: 100,
            category: 'food',
            date: getTestDate(),
            ledgerId: defaultLedgerId,
          })
          .expect(400)
      })

      it('缺少 amount：应返回 400', async () => {
        await request(app.getHttpServer())
          .post('/api/records')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            type: 'expense',
            category: 'food',
            date: getTestDate(),
            ledgerId: defaultLedgerId,
          })
          .expect(400)
      })

      it('金额为0：应返回 400', async () => {
        await request(app.getHttpServer())
          .post('/api/records')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            type: 'expense',
            amount: 0,
            category: 'food',
            date: getTestDate(),
            ledgerId: defaultLedgerId,
          })
          .expect(400)
      })

      it('金额为负数：应返回 400', async () => {
        await request(app.getHttpServer())
          .post('/api/records')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            type: 'expense',
            amount: -100,
            category: 'food',
            date: getTestDate(),
            ledgerId: defaultLedgerId,
          })
          .expect(400)
      })

      it('缺少 category：应返回 400', async () => {
        await request(app.getHttpServer())
          .post('/api/records')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            type: 'expense',
            amount: 100,
            date: getTestDate(),
            ledgerId: defaultLedgerId,
          })
          .expect(400)
      })

      it('category 为空：应返回 400', async () => {
        await request(app.getHttpServer())
          .post('/api/records')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            type: 'expense',
            amount: 100,
            category: '',
            date: getTestDate(),
            ledgerId: defaultLedgerId,
          })
          .expect(400)
      })

      it('缺少 date：应返回 400', async () => {
        await request(app.getHttpServer())
          .post('/api/records')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            type: 'expense',
            amount: 100,
            category: 'food',
            ledgerId: defaultLedgerId,
          })
          .expect(400)
      })

      it('无效的 date 格式：应返回 400', async () => {
        await request(app.getHttpServer())
          .post('/api/records')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            type: 'expense',
            amount: 100,
            category: 'food',
            date: 'invalid-date',
            ledgerId: defaultLedgerId,
          })
          .expect(400)
      })

      it('缺少 ledgerId：应返回 400', async () => {
        await request(app.getHttpServer())
          .post('/api/records')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            type: 'expense',
            amount: 100,
            category: 'food',
            date: getTestDate(),
          })
          .expect(400)
      })

      it('备注超过200字：应返回 400', async () => {
        await request(app.getHttpServer())
          .post('/api/records')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            type: 'expense',
            amount: 100,
            category: 'food',
            date: getTestDate(),
            ledgerId: defaultLedgerId,
            note: 'a'.repeat(201),
          })
          .expect(400)
      })

      it('无 token：应返回 401', async () => {
        await request(app.getHttpServer())
          .post('/api/records')
          .send({
            type: 'expense',
            amount: 100,
            category: 'food',
            date: getTestDate(),
            ledgerId: defaultLedgerId,
          })
          .expect(401)
      })
    })
  })

  // ============================================
  // GET /api/records/:id - 获取单条记录
  // ============================================
  describe('GET /api/records/:id', () => {
    let testRecordId: string

    beforeEach(async () => {
      const record = await createTestRecord(app, authToken, {
        type: 'expense',
        amount: 100,
        category: 'food',
        date: getTestDate(),
        ledgerId: defaultLedgerId,
        note: '测试记录',
      })
      testRecordId = record.id
    })

    describe('成功场景', () => {
      it('应返回指定记录', async () => {
        const response = await request(app.getHttpServer())
          .get(`/api/records/${testRecordId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)

        expect(response.body.code).toBe(0)
        expect(response.body.data.id).toBe(testRecordId)
        expect(response.body.data.amount).toBe(100)
        expect(response.body.data.note).toBe('测试记录')
      })

      it('应支持通过 clientId 查询', async () => {
        const clientId = generateClientId('record')
        const record = await createTestRecord(app, authToken, {
          type: 'expense',
          amount: 200,
          category: 'transport',
          date: getTestDate(),
          ledgerId: defaultLedgerId,
          clientId,
        })

        const response = await request(app.getHttpServer())
          .get(`/api/records/${clientId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)

        expect(response.body.data.id).toBe(record.id)
        expect(response.body.data.amount).toBe(200)
      })
    })

    describe('失败场景', () => {
      it('记录不存在：应返回 404', async () => {
        await request(app.getHttpServer())
          .get('/api/records/non-existent-id')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404)
      })

      it('其他用户的记录：应返回 404', async () => {
        const { token: token2 } = await loginAndGetToken(app, TEST_USER_2.phone)

        await request(app.getHttpServer())
          .get(`/api/records/${testRecordId}`)
          .set('Authorization', `Bearer ${token2}`)
          .expect(404)
      })

      it('无 token：应返回 401', async () => {
        await request(app.getHttpServer())
          .get(`/api/records/${testRecordId}`)
          .expect(401)
      })
    })
  })

  // ============================================
  // PUT /api/records/:id - 更新记录
  // ============================================
  describe('PUT /api/records/:id', () => {
    let testRecordId: string

    beforeEach(async () => {
      const record = await createTestRecord(app, authToken, {
        type: 'expense',
        amount: 100,
        category: 'food',
        date: getTestDate(),
        ledgerId: defaultLedgerId,
        note: '原始备注',
      })
      testRecordId = record.id
    })

    describe('成功场景', () => {
      it('应成功更新金额', async () => {
        const response = await request(app.getHttpServer())
          .put(`/api/records/${testRecordId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ amount: 200 })
          .expect(200)

        expect(response.body.data.amount).toBe(200)
        expect(response.body.data.category).toBe('food') // 未修改的保持不变
      })

      it('应成功更新类型', async () => {
        const response = await request(app.getHttpServer())
          .put(`/api/records/${testRecordId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ type: 'income' })
          .expect(200)

        expect(response.body.data.type).toBe('income')
      })

      it('应成功更新分类', async () => {
        const response = await request(app.getHttpServer())
          .put(`/api/records/${testRecordId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ category: 'transport' })
          .expect(200)

        expect(response.body.data.category).toBe('transport')
      })

      it('应成功更新日期', async () => {
        const newDate = getTestDate(-5)
        const response = await request(app.getHttpServer())
          .put(`/api/records/${testRecordId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ date: newDate })
          .expect(200)

        expect(response.body.data.date).toBe(newDate)
      })

      it('应成功更新备注', async () => {
        const response = await request(app.getHttpServer())
          .put(`/api/records/${testRecordId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ note: '新备注' })
          .expect(200)

        expect(response.body.data.note).toBe('新备注')
      })

      it('应成功同时更新多个字段', async () => {
        const response = await request(app.getHttpServer())
          .put(`/api/records/${testRecordId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            type: 'income',
            amount: 5000,
            category: 'salary',
            note: '奖金',
          })
          .expect(200)

        expect(response.body.data.type).toBe('income')
        expect(response.body.data.amount).toBe(5000)
        expect(response.body.data.category).toBe('salary')
        expect(response.body.data.note).toBe('奖金')
      })
    })

    describe('失败场景', () => {
      it('记录不存在：应返回 404', async () => {
        await request(app.getHttpServer())
          .put('/api/records/non-existent-id')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ amount: 200 })
          .expect(404)
      })

      it('无效的 type：应返回 400', async () => {
        await request(app.getHttpServer())
          .put(`/api/records/${testRecordId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ type: 'invalid' })
          .expect(400)
      })

      it('金额为0：应返回 400', async () => {
        await request(app.getHttpServer())
          .put(`/api/records/${testRecordId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ amount: 0 })
          .expect(400)
      })

      it('金额为负数：应返回 400', async () => {
        await request(app.getHttpServer())
          .put(`/api/records/${testRecordId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ amount: -100 })
          .expect(400)
      })

      it('备注超过200字：应返回 400', async () => {
        await request(app.getHttpServer())
          .put(`/api/records/${testRecordId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ note: 'a'.repeat(201) })
          .expect(400)
      })

      it('其他用户的记录：应返回 404', async () => {
        const { token: token2 } = await loginAndGetToken(app, TEST_USER_2.phone)

        await request(app.getHttpServer())
          .put(`/api/records/${testRecordId}`)
          .set('Authorization', `Bearer ${token2}`)
          .send({ amount: 200 })
          .expect(404)
      })

      it('无 token：应返回 401', async () => {
        await request(app.getHttpServer())
          .put(`/api/records/${testRecordId}`)
          .send({ amount: 200 })
          .expect(401)
      })
    })
  })

  // ============================================
  // DELETE /api/records/:id - 删除记录
  // ============================================
  describe('DELETE /api/records/:id', () => {
    let testRecordId: string

    beforeEach(async () => {
      const record = await createTestRecord(app, authToken, {
        type: 'expense',
        amount: 100,
        category: 'food',
        date: getTestDate(),
        ledgerId: defaultLedgerId,
      })
      testRecordId = record.id
    })

    describe('成功场景', () => {
      it('应成功删除记录', async () => {
        const response = await request(app.getHttpServer())
          .delete(`/api/records/${testRecordId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)

        expect(response.body.code).toBe(0)
        expect(response.body.data.deleted).toBe(true)
      })

      it('删除后应无法查询到', async () => {
        await request(app.getHttpServer())
          .delete(`/api/records/${testRecordId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)

        await request(app.getHttpServer())
          .get(`/api/records/${testRecordId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404)
      })

      it('删除后记录列表应减少', async () => {
        // 再创建一条记录
        await createTestRecord(app, authToken, {
          type: 'expense',
          amount: 200,
          category: 'transport',
          date: getTestDate(),
          ledgerId: defaultLedgerId,
        })

        // 删除前应有2条
        const beforeRes = await request(app.getHttpServer())
          .get('/api/records')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)
        expect(beforeRes.body.data).toHaveLength(2)

        // 删除一条
        await request(app.getHttpServer())
          .delete(`/api/records/${testRecordId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)

        // 删除后应有1条
        const afterRes = await request(app.getHttpServer())
          .get('/api/records')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)
        expect(afterRes.body.data).toHaveLength(1)
      })
    })

    describe('失败场景', () => {
      it('记录不存在：应返回 404', async () => {
        await request(app.getHttpServer())
          .delete('/api/records/non-existent-id')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404)
      })

      it('其他用户的记录：应返回 404', async () => {
        const { token: token2 } = await loginAndGetToken(app, TEST_USER_2.phone)

        await request(app.getHttpServer())
          .delete(`/api/records/${testRecordId}`)
          .set('Authorization', `Bearer ${token2}`)
          .expect(404)
      })

      it('无 token：应返回 401', async () => {
        await request(app.getHttpServer())
          .delete(`/api/records/${testRecordId}`)
          .expect(401)
      })
    })
  })

  // ============================================
  // POST /api/records/batch-delete - 批量删除记录
  // ============================================
  describe('POST /api/records/batch-delete', () => {
    let recordIds: string[]

    beforeEach(async () => {
      recordIds = []
      for (let i = 0; i < 5; i++) {
        const record = await createTestRecord(app, authToken, {
          type: 'expense',
          amount: (i + 1) * 100,
          category: 'food',
          date: getTestDate(-i),
          ledgerId: defaultLedgerId,
        })
        recordIds.push(record.id)
      }
    })

    describe('成功场景', () => {
      it('应成功批量删除记录', async () => {
        const idsToDelete = recordIds.slice(0, 3) // 删除前3条

        const response = await request(app.getHttpServer())
          .post('/api/records/batch-delete')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ ids: idsToDelete })
          .expect(200)

        expect(response.body.code).toBe(0)
        expect(response.body.data.deleted).toBe(3)
      })

      it('删除后记录数应正确', async () => {
        const idsToDelete = recordIds.slice(0, 2)

        await request(app.getHttpServer())
          .post('/api/records/batch-delete')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ ids: idsToDelete })
          .expect(200)

        const recordsRes = await request(app.getHttpServer())
          .get('/api/records')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)

        expect(recordsRes.body.data).toHaveLength(3) // 5-2=3
      })

      it('删除空数组应返回 0', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/records/batch-delete')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ ids: [] })
          .expect(200)

        expect(response.body.data.deleted).toBe(0)
      })

      it('删除不存在的 id 应返回实际删除数', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/records/batch-delete')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ ids: [recordIds[0], 'non-existent-1', 'non-existent-2'] })
          .expect(200)

        expect(response.body.data.deleted).toBe(1) // 只有1条真实存在
      })

      it('只删除自己的记录，忽略其他用户的', async () => {
        // 用户2登录并创建记录
        const { token: token2 } = await loginAndGetToken(app, TEST_USER_2.phone)
        const user2Ledger = await request(app.getHttpServer())
          .get('/api/ledgers')
          .set('Authorization', `Bearer ${token2}`)
        const user2LedgerId = user2Ledger.body.data[0].id

        const user2Record = await createTestRecord(app, token2, {
          type: 'expense',
          amount: 1000,
          category: 'food',
          date: getTestDate(),
          ledgerId: user2LedgerId,
        })

        // 用户1尝试批量删除（包含用户2的记录）
        const response = await request(app.getHttpServer())
          .post('/api/records/batch-delete')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ ids: [recordIds[0], user2Record.id] })
          .expect(200)

        expect(response.body.data.deleted).toBe(1) // 只删除了自己的

        // 用户2的记录应该还在
        const user2RecordsRes = await request(app.getHttpServer())
          .get('/api/records')
          .set('Authorization', `Bearer ${token2}`)
          .expect(200)

        expect(user2RecordsRes.body.data).toHaveLength(1)
      })
    })

    describe('失败场景', () => {
      it('无 token：应返回 401', async () => {
        await request(app.getHttpServer())
          .post('/api/records/batch-delete')
          .send({ ids: recordIds })
          .expect(401)
      })
    })
  })

  // ============================================
  // 用户数据隔离测试
  // ============================================
  describe('用户数据隔离', () => {
    it('用户只能看到自己的记录', async () => {
      // 用户1创建记录
      await createTestRecord(app, authToken, {
        type: 'expense',
        amount: 100,
        category: 'food',
        date: getTestDate(),
        ledgerId: defaultLedgerId,
      })

      // 用户2登录
      const { token: token2 } = await loginAndGetToken(app, TEST_USER_2.phone)

      // 用户2查看记录列表
      const response = await request(app.getHttpServer())
        .get('/api/records')
        .set('Authorization', `Bearer ${token2}`)
        .expect(200)

      // 用户2应该看不到用户1的记录
      expect(response.body.data).toHaveLength(0)
    })

    it('用户不能更新其他用户的记录', async () => {
      const record = await createTestRecord(app, authToken, {
        type: 'expense',
        amount: 100,
        category: 'food',
        date: getTestDate(),
        ledgerId: defaultLedgerId,
      })

      const { token: token2 } = await loginAndGetToken(app, TEST_USER_2.phone)

      await request(app.getHttpServer())
        .put(`/api/records/${record.id}`)
        .set('Authorization', `Bearer ${token2}`)
        .send({ amount: 999 })
        .expect(404)
    })

    it('用户不能删除其他用户的记录', async () => {
      const record = await createTestRecord(app, authToken, {
        type: 'expense',
        amount: 100,
        category: 'food',
        date: getTestDate(),
        ledgerId: defaultLedgerId,
      })

      const { token: token2 } = await loginAndGetToken(app, TEST_USER_2.phone)

      await request(app.getHttpServer())
        .delete(`/api/records/${record.id}`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(404)
    })
  })

  // ============================================
  // 边界条件测试
  // ============================================
  describe('边界条件', () => {
    it('备注正好200字应成功', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/records')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'expense',
          amount: 100,
          category: 'food',
          date: getTestDate(),
          ledgerId: defaultLedgerId,
          note: 'a'.repeat(200),
        })
        .expect(201)

      expect(response.body.data.note).toHaveLength(200)
    })

    it('金额为0.01应成功', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/records')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'expense',
          amount: 0.01,
          category: 'food',
          date: getTestDate(),
          ledgerId: defaultLedgerId,
        })
        .expect(201)

      expect(response.body.data.amount).toBe(0.01)
    })

    it('未来日期应成功', async () => {
      const futureDate = getTestDate(30) // 30天后

      const response = await request(app.getHttpServer())
        .post('/api/records')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'expense',
          amount: 100,
          category: 'food',
          date: futureDate,
          ledgerId: defaultLedgerId,
        })
        .expect(201)

      expect(response.body.data.date).toBe(futureDate)
    })

    it('很久以前的日期应成功', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/records')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'expense',
          amount: 100,
          category: 'food',
          date: '2000-01-01',
          ledgerId: defaultLedgerId,
        })
        .expect(201)

      expect(response.body.data.date).toBe('2000-01-01')
    })
  })
})
