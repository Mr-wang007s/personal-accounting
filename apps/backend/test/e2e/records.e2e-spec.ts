import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import {
  createTestApp,
  getPrismaService,
  cleanDatabase,
  TEST_USER,
} from '../helpers/test-utils'
import { PrismaService } from '../../src/prisma/prisma.service'

describe('Records E2E Tests', () => {
  let app: INestApplication
  let prisma: PrismaService
  let authToken: string
  let userId: string

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
    // 登录获取 token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/dev/login')
      .send({ openid: TEST_USER.openid, nickname: TEST_USER.nickname })
    authToken = loginResponse.body.accessToken
    userId = loginResponse.body.user.id
  })

  describe('POST /records', () => {
    it('should create an expense record', async () => {
      const response = await request(app.getHttpServer())
        .post('/records')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'expense',
          amount: 100.5,
          category: 'food',
          date: '2024-01-15',
          note: '午餐',
        })
        .expect(201)

      expect(response.body).toMatchObject({
        type: 'expense',
        amount: 100.5,
        category: 'food',
        note: '午餐',
      })
      expect(response.body).toHaveProperty('id')
      expect(response.body).toHaveProperty('createdAt')
    })

    it('should create an income record', async () => {
      const response = await request(app.getHttpServer())
        .post('/records')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'income',
          amount: 5000,
          category: 'salary',
          date: '2024-01-01',
          note: '工资',
        })
        .expect(201)

      expect(response.body).toMatchObject({
        type: 'income',
        amount: 5000,
        category: 'salary',
        note: '工资',
      })
    })

    it('should validate required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/records')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'expense',
          // missing amount, category, date
        })
        .expect(400)

      expect(response.body.message).toBeInstanceOf(Array)
    })

    it('should reject invalid type', async () => {
      const response = await request(app.getHttpServer())
        .post('/records')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'invalid',
          amount: 100,
          category: 'food',
          date: '2024-01-15',
        })
        .expect(400)

      expect(response.body.message).toBeInstanceOf(Array)
    })

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .post('/records')
        .send({
          type: 'expense',
          amount: 100,
          category: 'food',
          date: '2024-01-15',
        })
        .expect(401)
    })
  })

  describe('GET /records', () => {
    beforeEach(async () => {
      // 创建测试数据
      await prisma.record.createMany({
        data: [
          {
            userId,
            type: 'expense',
            amount: 100,
            category: 'food',
            date: new Date('2024-01-15'),
            note: '午餐',
          },
          {
            userId,
            type: 'expense',
            amount: 50,
            category: 'transport',
            date: new Date('2024-01-16'),
            note: '打车',
          },
          {
            userId,
            type: 'income',
            amount: 5000,
            category: 'salary',
            date: new Date('2024-01-01'),
            note: '工资',
          },
        ],
      })
    })

    it('should return all records', async () => {
      const response = await request(app.getHttpServer())
        .get('/records')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.records).toHaveLength(3)
      expect(response.body).toHaveProperty('total', 3)
    })

    it('should filter by type', async () => {
      const response = await request(app.getHttpServer())
        .get('/records')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ type: 'expense' })
        .expect(200)

      expect(response.body.records).toHaveLength(2)
      response.body.records.forEach((record: any) => {
        expect(record.type).toBe('expense')
      })
    })

    it('should filter by date range', async () => {
      const response = await request(app.getHttpServer())
        .get('/records')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: '2024-01-15',
          endDate: '2024-01-16',
        })
        .expect(200)

      expect(response.body.records).toHaveLength(2)
    })

    it('should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/records')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, pageSize: 2 })
        .expect(200)

      expect(response.body.records).toHaveLength(2)
      expect(response.body.total).toBe(3)
    })
  })

  describe('GET /records/:id', () => {
    let recordId: string

    beforeEach(async () => {
      const record = await prisma.record.create({
        data: {
          userId,
          type: 'expense',
          amount: 100,
          category: 'food',
          date: new Date('2024-01-15'),
          note: '测试记录',
        },
      })
      recordId = record.id
    })

    it('should return a single record', async () => {
      const response = await request(app.getHttpServer())
        .get(`/records/${recordId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toMatchObject({
        id: recordId,
        type: 'expense',
        amount: 100,
        category: 'food',
        note: '测试记录',
      })
    })

    it('should return 404 for non-existent record', async () => {
      await request(app.getHttpServer())
        .get('/records/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
    })
  })

  describe('PUT /records/:id', () => {
    let recordId: string

    beforeEach(async () => {
      const record = await prisma.record.create({
        data: {
          userId,
          type: 'expense',
          amount: 100,
          category: 'food',
          date: new Date('2024-01-15'),
          note: '原始备注',
        },
      })
      recordId = record.id
    })

    it('should update a record', async () => {
      const response = await request(app.getHttpServer())
        .put(`/records/${recordId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 200,
          note: '更新后的备注',
        })
        .expect(200)

      expect(response.body).toMatchObject({
        id: recordId,
        amount: 200,
        note: '更新后的备注',
      })
      expect(response.body).toHaveProperty('updatedAt')
    })

    it('should return 404 for non-existent record', async () => {
      await request(app.getHttpServer())
        .put('/records/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 200 })
        .expect(404)
    })
  })

  describe('DELETE /records/:id', () => {
    let recordId: string

    beforeEach(async () => {
      const record = await prisma.record.create({
        data: {
          userId,
          type: 'expense',
          amount: 100,
          category: 'food',
          date: new Date('2024-01-15'),
        },
      })
      recordId = record.id
    })

    it('should delete a record (soft delete)', async () => {
      await request(app.getHttpServer())
        .delete(`/records/${recordId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204)

      // 验证记录被软删除
      const record = await prisma.record.findUnique({
        where: { id: recordId },
      })
      expect(record?.deletedAt).not.toBeNull()
    })
  })

  describe('POST /records/batch-delete', () => {
    let recordIds: string[]

    beforeEach(async () => {
      const records = await Promise.all([
        prisma.record.create({
          data: {
            userId,
            type: 'expense',
            amount: 100,
            category: 'food',
            date: new Date('2024-01-15'),
          },
        }),
        prisma.record.create({
          data: {
            userId,
            type: 'expense',
            amount: 200,
            category: 'transport',
            date: new Date('2024-01-16'),
          },
        }),
      ])
      recordIds = records.map((r) => r.id)
    })

    it('should batch delete records', async () => {
      const response = await request(app.getHttpServer())
        .post('/records/batch-delete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ids: recordIds })
        .expect(200)

      expect(response.body.deleted).toBe(2)
    })
  })

  describe('GET /records/statistics', () => {
    beforeEach(async () => {
      await prisma.record.createMany({
        data: [
          {
            userId,
            type: 'expense',
            amount: 100,
            category: 'food',
            date: new Date('2024-01-15'),
          },
          {
            userId,
            type: 'expense',
            amount: 200,
            category: 'transport',
            date: new Date('2024-01-16'),
          },
          {
            userId,
            type: 'income',
            amount: 5000,
            category: 'salary',
            date: new Date('2024-01-01'),
          },
        ],
      })
    })

    it('should return statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/records/statistics')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        })
        .expect(200)

      expect(response.body).toHaveProperty('totalIncome')
      expect(response.body).toHaveProperty('totalExpense')
      expect(response.body.totalIncome).toBe(5000)
      expect(response.body.totalExpense).toBe(300)
    })
  })

  describe('GET /records/monthly-trend', () => {
    it('should return monthly trend data', async () => {
      const response = await request(app.getHttpServer())
        .get('/records/monthly-trend')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ year: 2024 })
        .expect(200)

      expect(response.body).toBeInstanceOf(Array)
      expect(response.body.length).toBe(12)
    })
  })

  describe('GET /records/category-breakdown', () => {
    beforeEach(async () => {
      await prisma.record.createMany({
        data: [
          {
            userId,
            type: 'expense',
            amount: 100,
            category: 'food',
            date: new Date('2024-01-15'),
          },
          {
            userId,
            type: 'expense',
            amount: 200,
            category: 'food',
            date: new Date('2024-01-16'),
          },
          {
            userId,
            type: 'expense',
            amount: 50,
            category: 'transport',
            date: new Date('2024-01-17'),
          },
        ],
      })
    })

    it('should return category breakdown', async () => {
      const response = await request(app.getHttpServer())
        .get('/records/category-breakdown')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          type: 'expense',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        })
        .expect(200)

      expect(response.body).toBeInstanceOf(Array)
      expect(response.body.length).toBeGreaterThan(0)
    })
  })
})
