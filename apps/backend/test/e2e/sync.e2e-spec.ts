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

describe('Sync E2E Tests', () => {
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

  describe('POST /sync/backup', () => {
    it('should backup records to cloud', async () => {
      const response = await request(app.getHttpServer())
        .post('/sync/backup')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          records: [
            {
              clientId: 'client-record-001',
              type: 'expense',
              amount: 100,
              category: 'food',
              date: '2024-01-15',
              note: '午餐',
              createdAt: new Date().toISOString(),
            },
            {
              clientId: 'client-record-002',
              type: 'income',
              amount: 5000,
              category: 'salary',
              date: '2024-01-01',
              note: '工资',
              createdAt: new Date().toISOString(),
            },
          ],
        })
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.uploaded).toBe(2)
      expect(response.body.records).toHaveLength(2)
      expect(response.body.records[0]).toHaveProperty('clientId')
      expect(response.body.records[0]).toHaveProperty('serverId')
    })

    it('should update existing record if clientId exists', async () => {
      // 第一次备份
      await request(app.getHttpServer())
        .post('/sync/backup')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          records: [
            {
              clientId: 'client-record-003',
              type: 'expense',
              amount: 100,
              category: 'food',
              date: '2024-01-15',
              createdAt: new Date().toISOString(),
            },
          ],
        })
        .expect(201)

      // 第二次备份（更新）
      const response = await request(app.getHttpServer())
        .post('/sync/backup')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          records: [
            {
              clientId: 'client-record-003',
              type: 'expense',
              amount: 200, // 更新金额
              category: 'food',
              date: '2024-01-15',
              note: '更新后',
              createdAt: new Date().toISOString(),
            },
          ],
        })
        .expect(201)

      expect(response.body.uploaded).toBe(1)

      // 验证数据库中只有一条记录
      const records = await prisma.record.findMany({
        where: { userId, clientId: 'client-record-003' },
      })
      expect(records).toHaveLength(1)
      expect(Number(records[0].amount)).toBe(200)
      expect(records[0].note).toBe('更新后')
    })

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .post('/sync/backup')
        .send({ records: [] })
        .expect(401)
    })
  })

  describe('GET /sync/restore', () => {
    beforeEach(async () => {
      // 创建测试数据
      await prisma.record.createMany({
        data: [
          {
            userId,
            clientId: 'client-001',
            type: 'expense',
            amount: 100,
            category: 'food',
            date: new Date('2024-01-15'),
            note: '午餐',
          },
          {
            userId,
            clientId: 'client-002',
            type: 'income',
            amount: 5000,
            category: 'salary',
            date: new Date('2024-01-01'),
            note: '工资',
          },
        ],
      })
    })

    it('should restore all records from cloud', async () => {
      const response = await request(app.getHttpServer())
        .get('/sync/restore')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.records).toHaveLength(2)
      
      const record = response.body.records.find((r: any) => r.clientId === 'client-001')
      expect(record).toBeDefined()
      expect(record.serverId).toBeDefined()
      expect(record.type).toBe('expense')
      expect(record.amount).toBe(100)
      expect(record.category).toBe('food')
    })

    it('should not return deleted records', async () => {
      // 软删除一条记录
      await prisma.record.updateMany({
        where: { userId, clientId: 'client-001' },
        data: { deletedAt: new Date() },
      })

      const response = await request(app.getHttpServer())
        .get('/sync/restore')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.records).toHaveLength(1)
      expect(response.body.records[0].clientId).toBe('client-002')
    })
  })

  describe('POST /sync/delete-cloud', () => {
    let serverId: string

    beforeEach(async () => {
      const record = await prisma.record.create({
        data: {
          userId,
          clientId: 'client-to-delete',
          type: 'expense',
          amount: 100,
          category: 'food',
          date: new Date('2024-01-15'),
        },
      })
      serverId = record.id
    })

    it('should delete cloud records', async () => {
      const response = await request(app.getHttpServer())
        .post('/sync/delete-cloud')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ serverIds: [serverId] })
        .expect(201)

      expect(response.body.deleted).toBe(1)

      // 验证软删除
      const record = await prisma.record.findUnique({
        where: { id: serverId },
      })
      expect(record?.deletedAt).not.toBeNull()
    })

    it('should handle non-existent ids gracefully', async () => {
      const response = await request(app.getHttpServer())
        .post('/sync/delete-cloud')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ serverIds: ['non-existent-id'] })
        .expect(201)

      expect(response.body.deleted).toBe(0)
    })
  })
})
