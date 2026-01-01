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

    // 手机号登录获取 token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/phone/login')
      .send({ phone: TEST_USER.phone, nickname: TEST_USER.nickname })
      .expect(200)

    authToken = loginResponse.body.accessToken
    userId = loginResponse.body.user.id
  })

  describe('POST /sync/backup-ledgers', () => {
    it('should backup ledgers to cloud', async () => {
      const response = await request(app.getHttpServer())
        .post('/sync/backup-ledgers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ledgers: [
            {
              clientId: 'ledger-client-001',
              name: '日常开销',
              icon: 'wallet',
              color: '#6366F1',
              createdAt: new Date().toISOString(),
            },
            {
              clientId: 'ledger-client-002',
              name: '旅行基金',
              icon: 'plane',
              color: '#10B981',
              createdAt: new Date().toISOString(),
            },
          ],
        })
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.uploaded).toBe(2)
      expect(response.body.ledgers).toHaveLength(2)
      expect(response.body.ledgers[0]).toHaveProperty('clientId')
      expect(response.body.ledgers[0]).toHaveProperty('serverId')

      // serverId 应该与 clientId 一致（服务端使用 clientId 作为主键）
      expect(response.body.ledgers.map((l: any) => l.serverId).sort()).toEqual(
        ['ledger-client-001', 'ledger-client-002'].sort(),
      )
    })

    it('should update existing ledger if clientId exists', async () => {
      // 第一次备份
      await request(app.getHttpServer())
        .post('/sync/backup-ledgers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ledgers: [
            {
              clientId: 'ledger-client-003',
              name: '旧名称',
              icon: 'wallet',
              color: '#000000',
              createdAt: new Date().toISOString(),
            },
          ],
        })
        .expect(201)

      // 第二次备份（更新）
      const response = await request(app.getHttpServer())
        .post('/sync/backup-ledgers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ledgers: [
            {
              clientId: 'ledger-client-003',
              name: '新名称',
              icon: 'book',
              color: '#FFFFFF',
              createdAt: new Date().toISOString(),
            },
          ],
        })
        .expect(201)

      expect(response.body.uploaded).toBe(1)

      const ledgers = await prisma.ledger.findMany({
        where: { userId, clientId: 'ledger-client-003', deletedAt: null },
      })
      expect(ledgers).toHaveLength(1)
      expect(ledgers[0].name).toBe('新名称')
      expect(ledgers[0].icon).toBe('book')
      expect(ledgers[0].color).toBe('#FFFFFF')
    })

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .post('/sync/backup-ledgers')
        .send({ ledgers: [] })
        .expect(401)
    })
  })

  describe('POST /sync/backup', () => {
    beforeEach(async () => {
      // 创建一个账本供记录引用
      await prisma.ledger.create({
        data: {
          id: 'ledger-client-001',
          clientId: 'ledger-client-001',
          userId,
          name: '默认账本',
          createdAt: new Date(),
        },
      })
    })

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
              ledgerId: 'ledger-client-001',
              createdAt: new Date().toISOString(),
            },
            {
              clientId: 'client-record-002',
              type: 'income',
              amount: 5000,
              category: 'salary',
              date: '2024-01-01',
              note: '工资',
              ledgerId: 'ledger-client-001',
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
              ledgerId: 'ledger-client-001',
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
              ledgerId: 'ledger-client-001',
              createdAt: new Date().toISOString(),
            },
          ],
        })
        .expect(201)

      expect(response.body.uploaded).toBe(1)

      // 验证数据库中只有一条记录
      const records = await prisma.record.findMany({
        where: { userId, clientId: 'client-record-003', deletedAt: null },
      })
      expect(records).toHaveLength(1)
      expect(Number(records[0].amount)).toBe(200)
      expect(records[0].note).toBe('更新后')
      expect(records[0].ledgerId).toBe('ledger-client-001')
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
      // 创建账本 + 记录
      await prisma.ledger.create({
        data: {
          id: 'ledger-client-restore',
          clientId: 'ledger-client-restore',
          userId,
          name: '恢复账本',
          createdAt: new Date('2024-01-01'),
        },
      })

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
            ledgerId: 'ledger-client-restore',
          },
          {
            userId,
            clientId: 'client-002',
            type: 'income',
            amount: 5000,
            category: 'salary',
            date: new Date('2024-01-01'),
            note: '工资',
            ledgerId: 'ledger-client-restore',
          },
        ],
      })
    })

    it('should restore all ledgers and records from cloud', async () => {
      const response = await request(app.getHttpServer())
        .get('/sync/restore')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.ledgers).toHaveLength(1)
      expect(response.body.records).toHaveLength(2)

      const ledger = response.body.ledgers[0]
      expect(ledger.clientId).toBe('ledger-client-restore')
      expect(ledger.serverId).toBe('ledger-client-restore')
      expect(ledger.name).toBe('恢复账本')

      const record = response.body.records.find((r: any) => r.clientId === 'client-001')
      expect(record).toBeDefined()
      expect(record.serverId).toBeDefined()
      expect(record.type).toBe('expense')
      expect(record.amount).toBe(100)
      expect(record.category).toBe('food')
      expect(record.ledgerId).toBe('ledger-client-restore')
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
      await prisma.ledger.create({
        data: {
          id: 'ledger-client-delete',
          clientId: 'ledger-client-delete',
          userId,
          name: '删除测试账本',
          createdAt: new Date('2024-01-01'),
        },
      })

      const record = await prisma.record.create({
        data: {
          userId,
          clientId: 'client-to-delete',
          type: 'expense',
          amount: 100,
          category: 'food',
          date: new Date('2024-01-15'),
          ledgerId: 'ledger-client-delete',
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
