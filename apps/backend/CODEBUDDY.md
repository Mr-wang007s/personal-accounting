# Backend API - 详细指南

> 继承自 [根目录 CODEBUDDY.md](../../CODEBUDDY.md)，本文件提供后端开发细节。

## 命令

```bash
# 初始化
cp .env.example .env            # 创建环境配置
pnpm db:generate                # 生成 Prisma Client
pnpm db:migrate                 # 运行迁移

# 开发（本地 SQLite）
pnpm db:init-sqlite             # 初始化 SQLite 数据库
pnpm dev                        # 热重载开发服务器
pnpm dev:debug                  # 带调试器

# 数据库切换
pnpm db:use-sqlite              # 切换到 SQLite（本地开发）
pnpm db:use-mysql               # 切换到 MySQL（线上）
pnpm db:init-sqlite             # 初始化 SQLite + 创建表

# 数据库管理
pnpm db:studio                  # Prisma Studio (http://localhost:5555)
pnpm db:push                    # 推送 schema 变更（无迁移）
pnpm db:seed                    # 填充测试数据

# 构建
pnpm build                      # 生产构建
pnpm start:prod                 # 运行生产版本
```

## 技术栈

- **NestJS 10** + TypeScript
- **Prisma 6** + **SQLite**（本地）/ **MySQL**（线上）
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
└── ledgers/                    # 账本管理
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

### 登录方式

**手机号登录** (`POST /api/auth/phone/login`)
- 小程序和 Web 端统一使用此接口
- 新用户自动注册并创建默认账本
- 返回 JWT 令牌用于后续请求认证

### 流程

1. 默认所有路由需要 JWT（全局 `JwtAuthGuard`）
2. `@Public()` 装饰器跳过认证
3. `@CurrentUser()` 获取当前用户

### 开发测试

```bash
# 手机号登录
curl -X POST http://localhost:3000/api/auth/phone/login \
  -H "Content-Type: application/json" \
  -d '{"phone": "13800138000"}'
```

返回：`{ accessToken, user, isNewUser }`

## API 端点

### Auth (`/api/auth`)

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/phone/login` | 手机号登录/注册 | 公开 |
| POST | `/refresh` | 刷新令牌 | 需要 |
| GET | `/me` | 获取当前用户信息 | 需要 |

**手机号登录请求**：
```json
POST /api/auth/phone/login
{
  "phone": "13800138000",
  "nickname": "用户昵称"  // 可选，默认取手机号后4位
}
```

**登录响应**：
```json
{
  "accessToken": "eyJhbG...",
  "user": {
    "id": "cuid...",
    "phone": "13800138000",
    "nickname": "用户8000"
  },
  "isNewUser": true  // 是否为新注册用户
}
```

**说明**：
- 新用户首次登录会自动注册并创建默认账本
- 小程序和 Web 端使用相同的登录接口

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

### Ledgers (`/api/ledgers`)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/` | 创建账本 |
| GET | `/` | 获取账本列表 |
| GET | `/:id` | 获取单个账本 |
| PUT | `/:id` | 更新账本 |
| DELETE | `/:id` | 软删除账本 |

## 数据库 Schema

```prisma
// 本地开发使用 SQLite，线上使用 MySQL
datasource db {
  provider = "sqlite"  // 或 "mysql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  phone     String   @unique    // 手机号（主要标识）
  openid    String?  @unique    // 微信 openid
  unionid   String?  @unique    // 微信 unionid
  nickname  String?
  avatar    String?
  password  String?             // Web 端密码
  records   Record[]
  ledgers   Ledger[]
}

model Ledger {
  id        String     @id @default(cuid())
  name      String
  icon      String?
  color     String?
  clientId  String?             // 客户端 ID
  userPhone String              // 外键：用户手机号
  user      User       @relation(...)
  records   Record[]
  deletedAt DateTime?           // 软删除
}

model Record {
  id        String     @id @default(cuid())
  type      RecordType // income | expense
  amount    Decimal    @db.Decimal(10, 2)
  category  String
  date      DateTime
  note      String?
  clientId  String?             // 客户端 ID
  userPhone String              // 外键：用户手机号
  ledgerId  String              // 外键：账本 ID
  user      User       @relation(...)
  ledger    Ledger     @relation(...)
  deletedAt DateTime?           // 软删除
}

enum RecordType {
  income
  expense
}
```

**设计要点**：
- 使用 `phone` 作为用户主要标识和外键（用户注销重注册后数据不丢失）
- 所有实体支持软删除（`deletedAt` 字段）
- `clientId` 用于客户端同步时匹配本地记录

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
| `DATABASE_URL` | 是 | MySQL 连接字符串 |
| `JWT_SECRET` | 是 | JWT 签名密钥 |
| `JWT_EXPIRES_IN` | 否 | 令牌有效期 (默认: `7d`) |
| `WECHAT_APP_ID` | 生产 | 微信小程序 AppID |
| `WECHAT_APP_SECRET` | 生产 | 微信小程序 Secret |
| `PORT` | 否 | 服务端口 (默认: `3000`) |

## 部署

### 腾讯云托管

```bash
# 使用 Dockerfile 部署
docker build -t pa-api .
```

**CloudBase 配置** (`cloudbaserc.json`):
```json
{
  "envId": "my-100-app-7g9jwge5b3870b6a",
  "cloudrun": { "name": "pa-api" }
}
```

**生产地址**: https://pa-api-213254-5-1253552496.sh.run.tcloudbase.com


