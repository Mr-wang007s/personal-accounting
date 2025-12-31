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

describe('Sync E2E Tests', () => {
  let app: INestApplication
  let prisma: PrismaService
  const deviceId = 'test-device-001'

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
    await createTestUser(prisma)
  })

  describe('GET /sync/status', () => {
    it('should return sync status', async () => {
      const response = await request(app.getHttpServer())
        .get('/sync/status')
        .set('X-Device-Id', deviceId)
        .expect(200)

      expect(response.body).toHaveProperty('serverVersion')
      expect(response.body).toHaveProperty('deviceId')
      expect(response.body).toHaveProperty('needsSync')
    })
  })

  describe('GET /sync/pull', () => {
    beforeEach(async () => {
      // 创建一些测试记录
      await prisma.record.createMany({
        data: [
          {
            userId: MOCK_USER.id,
            type: 'expense',
            amount: 100,
            category: 'food',
            date: new Date('2024-01-15'),
            syncVersion: 1,
          },
          {
            userId: MOCK_USER.id,
            type: 'income',
            amount: 5000,
            category: 'salary',
            date: new Date('2024-01-01'),
            syncVersion: 2,
          },
        ],
      })
    })

    it('should pull changes since last sync version', async () => {
      const response = await request(app.getHttpServer())
        .get('/sync/pull')
        .set('X-Device-Id', deviceId)
        .query({ lastSyncVersion: 0 })
        .expect(200)

      expect(response.body).toHaveProperty('changes')
      expect(response.body).toHaveProperty('serverVersion')
      expect(response.body.changes).toBeInstanceOf(Array)
      expect(response.body.changes.length).toBe(2)
    })

    it('should return only new changes', async () => {
      const response = await request(app.getHttpServer())
        .get('/sync/pull')
        .set('X-Device-Id', deviceId)
        .query({ lastSyncVersion: 1 })
        .expect(200)

      expect(response.body.changes.length).toBe(1)
      expect(response.body.changes[0].syncVersion).toBe(2)
    })
  })

  describe('POST /sync/push', () => {
    it('should push new records', async () => {
      const response = await request(app.getHttpServer())
        .post('/sync/push')
        .set('X-Device-Id', deviceId)
        .send({
          created: [
            {
              clientId: 'client-record-001',
              type: 'expense',
              amount: 100,
              category: 'food',
              date: '2024-01-15',
              note: '午餐',
            },
          ],
          updated: [],
          deleted: [],
        })
        .expect(201)

      expect(response.body).toHaveProperty('serverVersion')
      expect(response.body).toHaveProperty('created')
      expect(response.body.created).toBe(1)
    })

    it('should handle update operations', async () => {
      // 先创建一条记录
      const record = await prisma.record.create({
        data: {
          userId: MOCK_USER.id,
          type: 'expense',
          amount: 100,
          category: 'food',
          date: new Date('2024-01-15'),
          clientId: 'client-record-002',
          syncVersion: 1,
        },
      })

      const response = await request(app.getHttpServer())
        .post('/sync/push')
        .set('X-Device-Id', deviceId)
        .send({
          created: [],
          updated: [
            {
              id: record.id,
              clientId: 'client-record-002',
              amount: 200,
              note: '更新后',
              syncVersion: 1,
            },
          ],
          deleted: [],
        })
        .expect(201)

      expect(response.body.updated).toBe(1)

      // 验证更新
      const updatedRecord = await prisma.record.findUnique({
        where: { id: record.id },
      })
      expect(Number(updatedRecord?.amount)).toBe(200)
    })

    it('should handle delete operations', async () => {
      const record = await prisma.record.create({
        data: {
          userId: MOCK_USER.id,
          type: 'expense',
          amount: 100,
          category: 'food',
          date: new Date('2024-01-15'),
          clientId: 'client-record-003',
          syncVersion: 1,
        },
      })

      const response = await request(app.getHttpServer())
        .post('/sync/push')
        .set('X-Device-Id', deviceId)
        .send({
          created: [],
          updated: [],
          deleted: [record.id],
        })
        .expect(201)

      expect(response.body.deleted).toBe(1)

      // 验证软删除
      const deletedRecord = await prisma.record.findUnique({
        where: { id: record.id },
      })
      expect(deletedRecord?.deletedAt).not.toBeNull()
    })
  })

  describe('GET /sync/full', () => {
    beforeEach(async () => {
      await prisma.record.createMany({
        data: [
          {
            userId: MOCK_USER.id,
            type: 'expense',
            amount: 100,
            category: 'food',
            date: new Date('2024-01-15'),
          },
          {
            userId: MOCK_USER.id,
            type: 'income',
            amount: 5000,
            category: 'salary',
            date: new Date('2024-01-01'),
          },
        ],
      })
    })

    it('should return full sync data', async () => {
      const response = await request(app.getHttpServer())
        .get('/sync/full')
        .set('X-Device-Id', deviceId)
        .expect(200)

      expect(response.body).toHaveProperty('records')
      expect(response.body).toHaveProperty('serverVersion')
      expect(response.body.records).toBeInstanceOf(Array)
      expect(response.body.records.length).toBe(2)
    })
  })
})
