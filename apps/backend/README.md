# @personal-accounting/backend

个人记账应用后端服务，支持局域网部署和离线同步。

## 技术栈

- **框架**: Nest.js 10
- **ORM**: Prisma 6
- **数据库**: SQLite（零配置，文件数据库）
- **缓存**: 内存缓存（无需 Redis）
- **认证**: JWT + Passport
- **文档**: Swagger/OpenAPI
- **服务发现**: UDP 广播（局域网自动发现）

## 功能模块

| 模块 | 路径 | 说明 |
|------|------|------|
| Auth | `/api/auth` | 微信登录、JWT 认证、Token 刷新 |
| Users | `/api/users` | 用户信息管理、统计 |
| Records | `/api/records` | 记账记录 CRUD、统计分析 |
| Sync | `/api/sync` | 多设备数据同步 |
| Discovery | `/api/discovery` | 局域网服务发现 |

## 开发环境

### 前置要求

- Node.js 18+
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
├── cache/                  # 内存缓存服务
│   ├── cache.module.ts
│   └── cache.service.ts
├── discovery/              # 局域网服务发现
│   ├── discovery.module.ts
│   ├── discovery.controller.ts
│   └── discovery.service.ts
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

### 服务发现

```
GET /api/discovery/info  - 获取服务信息（无需认证）
GET /api/discovery/ping  - 健康检查（无需认证）
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| DATABASE_URL | SQLite 文件路径 | file:./dev.db |
| JWT_SECRET | JWT 密钥 | - |
| JWT_EXPIRES_IN | JWT 过期时间 | 7d |
| WECHAT_APP_ID | 微信小程序 AppID | - |
| WECHAT_APP_SECRET | 微信小程序 Secret | - |
| PORT | 服务端口 | 3000 |
| NODE_ENV | 环境 | development |
| ENABLE_DISCOVERY | 启用局域网服务发现 | true |
| SKIP_AUTH | 跳过 JWT 认证（仅开发环境） | false |

## 开发环境认证跳过

在开发联调时，可以通过设置 `SKIP_AUTH=true` 环境变量来跳过 JWT 认证，无需获取 token 即可直接调用需要认证的接口。

### 配置方式

在 `.env` 文件中添加：

```bash
SKIP_AUTH=true
```

### 工作原理

当 `SKIP_AUTH=true` 且 `NODE_ENV` 不是 `production` 时：
- 所有需要认证的接口会自动使用 mock 用户
- Mock 用户 ID: `dev-user-001`
- Mock 用户 OpenID: `dev-openid-001`

### 注意事项

- 生产环境会自动忽略此配置
- 首次使用需确保数据库中存在 mock 用户（可通过 `/api/auth/dev/login` 创建）

## 测试

### 运行单元测试

```bash
pnpm test
```

### 运行 E2E 测试

```bash
# 运行所有 E2E 测试
pnpm test:e2e

# 监听模式
pnpm test:e2e:watch
```

### E2E 测试覆盖范围

- **认证测试** (`auth.e2e-spec.ts`)
  - 获取用户信息
  - 开发环境登录
  - Token 刷新

- **记账记录测试** (`records.e2e-spec.ts`)
  - 创建/查询/更新/删除记录
  - 批量删除
  - 统计数据
  - 月度趋势
  - 分类统计

- **数据同步测试** (`sync.e2e-spec.ts`)
  - 同步状态查询
  - 增量拉取
  - 推送变更
  - 全量同步

## 局域网部署

### 架构说明

```
┌─────────────────┐         ┌─────────────────────┐
│  手机/小程序     │  WiFi   │  家庭服务器 (NAS等)  │
│  (离线优先)     │ ◄─────► │  后端 + SQLite      │
│  IndexedDB/本地 │  同步   │  :3000              │
└─────────────────┘         └─────────────────────┘
```

### 服务发现机制

后端启动后会通过 UDP 广播（端口 41234）在局域网内广播服务信息，客户端可以：

1. **监听 UDP 广播** - 自动发现服务器 IP
2. **调用 `/api/discovery/ping`** - 验证服务器可用性

### 部署步骤

```bash
# 1. 构建
pnpm build

# 2. 启动（确保监听所有网络接口）
pnpm start:prod

# 服务将在所有网络接口上监听，局域网内设备可通过 IP 访问
```
