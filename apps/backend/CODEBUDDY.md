# Backend API - 详细指南

> 继承自 [根目录 CODEBUDDY.md](../../CODEBUDDY.md)，本文件提供后端开发细节。

## 命令

```bash
# 初始化
cp .env.example .env            # 创建环境配置
pnpm db:generate                # 生成 Prisma Client
pnpm db:migrate                 # 运行迁移

# 开发
pnpm dev                        # 热重载开发服务器
pnpm dev:debug                  # 带调试器

# 数据库
pnpm db:studio                  # Prisma Studio (http://localhost:5555)
pnpm db:push                    # 推送 schema 变更（无迁移）
pnpm db:seed                    # 填充测试数据

# 构建
pnpm build                      # 生产构建
pnpm start:prod                 # 运行生产版本
```

## 技术栈

- **NestJS 10** + TypeScript
- **Prisma 6** + SQLite
- **Passport** JWT 认证
- **Swagger** API 文档 (`/api/docs`)

## 模块结构

```
src/
├── main.ts                     # 启动配置（全局管道/过滤器/拦截器）
├── app.module.ts               # 根模块
├── prisma/
│   └── prisma.service.ts       # Prisma 客户端 + 生命周期
├── cache/
│   └── cache.service.ts        # 内存缓存（TTL + 前缀删除）
├── auth/
│   ├── auth.service.ts         # JWT 生成、登录逻辑
│   ├── wechat.service.ts       # 微信 API
│   ├── strategies/jwt.strategy.ts
│   ├── guards/jwt-auth.guard.ts
│   └── decorators/             # @Public(), @CurrentUser()
├── users/                      # 用户管理
├── records/                    # 记录 CRUD + 统计
├── sync/                       # 多设备同步
└── discovery/                  # 局域网发现
```

## 全局管道

```typescript
// main.ts 配置
app.useGlobalPipes(new ValidationPipe())           // DTO 验证
app.useGlobalFilters(new HttpExceptionFilter())    // 错误格式化
app.useGlobalInterceptors(
  new LoggingInterceptor(),                        // 请求日志
  new TransformInterceptor()                       // 响应包装
)
```

响应格式：
```json
{ "code": 0, "message": "success", "data": {...}, "timestamp": "2025-01-01T00:00:00.000Z" }
```

## 认证

### 流程

1. 默认所有路由需要 JWT（全局 `JwtAuthGuard`）
2. `@Public()` 装饰器跳过认证
3. `@CurrentUser()` 获取当前用户

### 开发登录

```bash
curl -X POST http://localhost:3000/api/auth/dev/login \
  -H "Content-Type: application/json" \
  -d '{"openid": "test_user"}'
```

返回：`{ accessToken, user }`

## API 端点

### Auth (`/api/auth`)

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/wechat/login` | 微信登录 | 公开 |
| POST | `/dev/login` | 开发登录 | 公开 |
| POST | `/refresh` | 刷新令牌 | 需要 |
| GET | `/profile` | 当前用户 | 需要 |

### Records (`/api/records`)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/` | 创建记录 |
| GET | `/` | 列表（支持筛选：type, category, startDate, endDate, keyword, page, pageSize） |
| GET | `/:id` | 获取单条 |
| PUT | `/:id` | 更新 |
| DELETE | `/:id` | 软删除 |
| POST | `/batch-delete` | 批量删除 |
| GET | `/statistics` | 日期范围统计 |
| GET | `/monthly-trend` | 年度趋势 |
| GET | `/category-breakdown` | 分类占比 |

### Sync (`/api/sync`)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/status` | 同步状态（clientVersion, serverVersion, needsSync） |
| GET | `/pull?lastSyncVersion=N` | 拉取 N 版本后的变更 |
| POST | `/push` | 推送变更 `{ created, updated, deleted }` |
| GET | `/full` | 全量同步（首次/恢复） |

### Discovery (`/api/discovery`)

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/info` | 服务信息 | 公开 |
| GET | `/ping` | 健康检查 | 公开 |

## 数据库 Schema

```prisma
model User {
  id        String   @id @default(cuid())
  openid    String   @unique
  unionid   String?  @unique
  nickname  String?
  avatar    String?
  records   Record[]
}

model Record {
  id          String     @id @default(cuid())
  userId      String
  type        RecordType // income | expense
  amount      Decimal
  category    String
  date        DateTime
  note        String?
  syncVersion Int        @default(0)
  clientId    String?
  deletedAt   DateTime?  // 软删除
  user        User       @relation(...)
}

model SyncVersion {
  userId        String
  deviceId      String
  serverVersion Int
  lastSyncAt    DateTime
  @@unique([userId, deviceId])
}
```

## 缓存服务

```typescript
// 使用
const cached = await cacheService.get<T>(key)
await cacheService.set(key, value, ttlMs)
await cacheService.deleteByPrefix('user:123:')

// 预定义 Key
CacheService.keys.userRecords(userId)
CacheService.keys.userStats(userId, dateRange)
```

- 内存 Map 实现，无需 Redis
- 60 秒自动清理过期项

## 环境变量

| 变量 | 必需 | 说明 |
|------|------|------|
| `DATABASE_URL` | 是 | SQLite 路径 (默认: `file:./dev.db`) |
| `JWT_SECRET` | 是 | JWT 签名密钥 |
| `JWT_EXPIRES_IN` | 否 | 令牌有效期 (默认: `7d`) |
| `WECHAT_APP_ID` | 生产 | 微信小程序 AppID |
| `WECHAT_APP_SECRET` | 生产 | 微信小程序 Secret |
| `PORT` | 否 | 服务端口 (默认: `3000`) |
| `ENABLE_DISCOVERY` | 否 | 局域网广播 (默认: `true`) |

## 同步机制

### 版本追踪

- 每条记录有 `syncVersion`，更新时递增
- 客户端通过 `X-Device-Id` 头标识设备
- `SyncVersion` 表记录每设备同步状态

### 冲突处理

```typescript
// sync.service.ts
if (existingRecord.syncVersion !== clientRecord.expectedVersion) {
  // 版本冲突，比较时间戳决定
}
```

### 软删除

删除操作设置 `deletedAt` 而非物理删除，确保同步完整性。
