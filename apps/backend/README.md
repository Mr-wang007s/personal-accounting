# @personal-accounting/backend

个人记账应用后端服务。

## 技术栈

- **框架**: Nest.js 10
- **ORM**: Prisma 6
- **数据库**: SQLite
- **缓存**: Redis (ioredis)
- **认证**: JWT + Passport
- **文档**: Swagger/OpenAPI

## 功能模块

| 模块 | 路径 | 说明 |
|------|------|------|
| Auth | `/api/auth` | 微信登录、JWT 认证、Token 刷新 |
| Users | `/api/users` | 用户信息管理、统计 |
| Records | `/api/records` | 记账记录 CRUD、统计分析 |
| Sync | `/api/sync` | 多设备数据同步 |

## 开发环境

### 前置要求

- Node.js 18+
- Redis 6+
- pnpm 8+

### 环境配置

```bash
# 复制环境变量文件
cp .env.example .env

# 编辑 .env 配置数据库连接等
```

### 开发命令

```bash
# 安装依赖（从项目根目录）
pnpm install

# 生成 Prisma Client
pnpm db:generate

# 运行数据库迁移
pnpm db:migrate

# 启动开发服务器
pnpm dev

# 打开 Prisma Studio（数据库管理界面）
pnpm db:studio
```

### 构建部署

```bash
# 构建生产版本
pnpm build

# 启动生产服务
pnpm start:prod
```

## API 文档

启动服务后访问 Swagger 文档：

```
http://localhost:3000/api/docs
```

## 项目结构

```
src/
├── main.ts                 # 应用入口
├── app.module.ts           # 根模块
├── prisma/                 # Prisma 服务
│   ├── prisma.module.ts
│   └── prisma.service.ts
├── redis/                  # Redis 服务
│   ├── redis.module.ts
│   └── redis.service.ts
├── auth/                   # 认证模块
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── wechat.service.ts
│   ├── strategies/
│   ├── guards/
│   ├── decorators/
│   └── dto/
├── users/                  # 用户模块
│   ├── users.module.ts
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── dto/
├── records/                # 记录模块
│   ├── records.module.ts
│   ├── records.controller.ts
│   ├── records.service.ts
│   └── dto/
├── sync/                   # 同步模块
│   ├── sync.module.ts
│   ├── sync.controller.ts
│   ├── sync.service.ts
│   └── dto/
└── common/                 # 公共模块
    ├── filters/
    └── interceptors/
```

## 数据模型

### User (用户)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 主键 |
| openid | string | 微信 openid |
| unionid | string? | 微信 unionid |
| nickname | string? | 昵称 |
| avatar | string? | 头像 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

### Record (记账记录)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 主键 |
| userId | string | 用户 ID |
| type | enum | income/expense |
| amount | Decimal | 金额 |
| category | string | 分类 ID |
| date | Date | 日期 |
| note | string? | 备注 |
| clientId | string? | 客户端 ID |
| syncVersion | int | 同步版本 |
| deletedAt | DateTime? | 软删除时间 |

## API 概览

### 认证

```
POST /api/auth/wechat/login  - 微信登录
POST /api/auth/refresh       - 刷新 Token
GET  /api/auth/profile       - 获取当前用户
POST /api/auth/dev/login     - 开发环境模拟登录
```

### 用户

```
GET  /api/users/me           - 获取当前用户
PUT  /api/users/me           - 更新用户信息
GET  /api/users/me/stats     - 获取用户统计
DELETE /api/users/me         - 删除账号
```

### 记录

```
POST   /api/records              - 创建记录
GET    /api/records              - 查询记录列表
GET    /api/records/:id          - 获取单条记录
PUT    /api/records/:id          - 更新记录
DELETE /api/records/:id          - 删除记录
POST   /api/records/batch-delete - 批量删除
GET    /api/records/statistics   - 获取统计数据
GET    /api/records/monthly-trend - 月度趋势
GET    /api/records/category-breakdown - 分类统计
```

### 同步

```
GET  /api/sync/status  - 获取同步状态
GET  /api/sync/pull    - 拉取增量数据
POST /api/sync/push    - 推送本地变更
GET  /api/sync/full    - 全量同步
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| DATABASE_URL | SQLite 文件路径 | file:./dev.db |
| REDIS_HOST | Redis 主机 | localhost |
| REDIS_PORT | Redis 端口 | 6379 |
| REDIS_PASSWORD | Redis 密码 | - |
| JWT_SECRET | JWT 密钥 | - |
| JWT_EXPIRES_IN | JWT 过期时间 | 7d |
| WECHAT_APP_ID | 微信小程序 AppID | - |
| WECHAT_APP_SECRET | 微信小程序 Secret | - |
| PORT | 服务端口 | 3000 |
| NODE_ENV | 环境 | development |
