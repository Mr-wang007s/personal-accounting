# Personal Accounting - 项目指南

> 继承自 [根目录 CODEBUDDY.md](../CODEBUDDY.md)

> 本文件为 personal-accounting 提供项目级指导。详细信息请参阅各子模块的 CODEBUDDY.md。

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发环境
pnpm dev              # 同时启动 web + backend
pnpm dev:web          # 仅前端 (http://localhost:5173)
pnpm dev:backend      # 仅后端 (http://localhost:3000)

# 构建
pnpm build            # 构建所有包（Turborepo 自动处理依赖顺序）

# 代码质量
pnpm typecheck        # 类型检查
pnpm lint             # ESLint
pnpm format           # 格式化
```

## 项目架构

### Monorepo 结构

```
personal-accounting/
├── packages/                    # 共享包
│   ├── shared/                  # 类型、常量、工具函数
│   └── business-logic/          # 纯计算逻辑（无副作用）
└── apps/
    ├── web/                     # React 前端 → apps/web/CODEBUDDY.md
    └── backend/                 # NestJS 后端 → apps/backend/CODEBUDDY.md
```

### 依赖关系

```
web ─────┬── business-logic ── shared
         └── shared

backend ─┬── business-logic ── shared
         └── shared
```

## 核心共享包

### `@personal-accounting/shared`

```typescript
// 类型
import type { Record, Category, Statistics, User } from '@personal-accounting/shared/types'

// 常量
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, getCategoryById } from '@personal-accounting/shared/constants'

// 工具
import { formatCurrency, dayjs, generateId } from '@personal-accounting/shared/utils'
```

**分类定义**：
- 支出 (10): 餐饮、交通、购物、娱乐、住房、医疗、教育、通讯、水电、其他
- 收入 (6): 工资、奖金、投资、兼职、退款、其他

### `@personal-accounting/business-logic`

```typescript
import { RecordCalculator } from '@personal-accounting/business-logic/records'
import { StatisticsService } from '@personal-accounting/business-logic/statistics'

RecordCalculator.calculateBalance(records)
RecordCalculator.getCategoryBreakdown(records)
StatisticsService.getStatistics(records, dateRange?)
```

## 数据模型

```typescript
interface Record {
  id: string                    // cuid
  type: 'income' | 'expense'
  amount: number
  category: string              // 分类 ID
  date: string                  // YYYY-MM-DD
  note?: string
  createdAt: string
  // 同步字段（后端）
  syncVersion: number
  clientId: string
  deletedAt?: string            // 软删除
}
```

## 同步架构

### 离线优先流程

1. 所有操作先写入 localStorage
2. 变更追踪到 `pendingChanges` Map
3. 3 秒防抖后自动同步
4. 网络恢复时同步待处理变更

### 版本协议

- 每条记录有 `syncVersion`，服务端更新时递增
- 客户端追踪 `recordVersions`: `{ isLocalOnly, localUpdatedAt, serverUpdatedAt }`
- Pull 返回指定版本后的变更

### 冲突解决

- 基于时间戳：后修改者胜出
- 冲突类型：`update_update`、`update_delete`、`delete_update`
- 默认策略：删除操作服务端优先

## API 概览

| 模块 | 端点 | 说明 |
|------|------|------|
| Auth | `/api/auth/dev/login` | 开发登录 (body: `{openid}`) |
| Records | `/api/records` | 记录 CRUD |
| Sync | `/api/sync/pull`, `/sync/push` | 增量同步 |
| Discovery | `/api/discovery/ping` | 健康检查 (无需认证) |

响应格式：`{ code, message, data, timestamp }`

## 子模块文档

- **前端详情**: [`apps/web/CODEBUDDY.md`](apps/web/CODEBUDDY.md)
- **后端详情**: [`apps/backend/CODEBUDDY.md`](apps/backend/CODEBUDDY.md)
