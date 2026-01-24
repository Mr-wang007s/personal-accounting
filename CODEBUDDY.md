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
│   ├── shared/                  # 类型、常量、工具函数 → packages/shared/CODEBUDDY.md
│   ├── business-logic/          # 纯计算逻辑（无副作用）→ packages/business-logic/CODEBUDDY.md
│   └── ui-components/           # 跨端 UI 组件（预留）
└── apps/
    ├── web/                     # React 前端 → apps/web/CODEBUDDY.md
    ├── backend/                 # NestJS 后端 → apps/backend/CODEBUDDY.md
    ├── miniprogram/             # 微信小程序 → apps/miniprogram/CODEBUDDY.md
    ├── mobile/                  # Flutter App → apps/mobile/CODEBUDDY.md
    └── harmony/                 # HarmonyOS 鸿蒙 → apps/harmony/CODEBUDDY.md
```

### 技术栈总览

| 模块 | 技术栈 | 状态 |
|------|--------|------|
| **Web 前端** | React 18 + TypeScript + Vite + Tailwind + shadcn/ui | ✅ 完成 |
| **后端服务** | NestJS 10 + Prisma 6 + MySQL + JWT | ✅ 完成 |
| **微信小程序** | 原生小程序 + TypeScript + 云托管 | ✅ 完成 |
| **Flutter 移动端** | Flutter 3.x + Provider + Dio | ✅ 完成 |
| **HarmonyOS 鸿蒙** | HarmonyOS 5.0 + ArkTS + ArkUI | ✅ 完成 |

### 依赖关系

```
┌─────────────────────────────────────────────────────────────────┐
│                        Applications                              │
├─────────────────────────────────────────────────────────────────┤
│  web ──────┬── @personal-accounting/business-logic              │
│            └── @personal-accounting/shared                      │
│                                                                 │
│  backend ──┬── @personal-accounting/business-logic              │
│            └── @personal-accounting/shared                      │
│                                                                 │
│  miniprogram (本地复制 shared 代码)                               │
│  mobile (Flutter，独立实现)                                      │
│  harmony (ArkTS，独立实现)                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Packages                                  │
├─────────────────────────────────────────────────────────────────┤
│  @personal-accounting/business-logic                            │
│            └── @personal-accounting/shared                      │
│                                                                 │
│  @personal-accounting/ui-components (预留)                      │
│            └── @personal-accounting/shared                      │
│                                                                 │
│  @personal-accounting/shared (基础包，无依赖)                     │
└─────────────────────────────────────────────────────────────────┘
```

## 核心共享包

### `@personal-accounting/shared`

```typescript
// 类型
import type { Record, Category, Statistics, User, Ledger } from '@personal-accounting/shared/types'

// 常量
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, getCategoryById } from '@personal-accounting/shared/constants'

// 工具
import { formatCurrency, dayjs, generateId, formatDate } from '@personal-accounting/shared/utils'
```

**分类定义**：
- 支出 (10): 餐饮、交通、购物、娱乐、住房、医疗、教育、通讯、水电、其他
- 收入 (6): 工资、奖金、投资、兼职、退款、其他

### `@personal-accounting/business-logic`

```typescript
import { RecordCalculator } from '@personal-accounting/business-logic/records'
import { StatisticsService } from '@personal-accounting/business-logic/statistics'

// 记录计算
RecordCalculator.calculateBalance(records)
RecordCalculator.calculateTotalIncome(records)
RecordCalculator.calculateTotalExpense(records)
RecordCalculator.getCategoryBreakdown(records)
RecordCalculator.getMonthlyTrend(records, year)
RecordCalculator.filterByDateRange(records, startDate, endDate)
RecordCalculator.groupByDate(records)

// 统计服务
StatisticsService.getStatistics(records, dateRange?)
StatisticsService.getMonthlyStatistics(records, year, month)
StatisticsService.getYearlyStatistics(records, year)
StatisticsService.compareStatistics(current, previous)
```

## 数据模型

### Record（记录）

```typescript
interface Record {
  id: string                    // cuid
  clientId?: string             // 客户端 ID（用于同步匹配）
  type: 'income' | 'expense'
  amount: number
  category: string              // 分类 ID
  date: string                  // YYYY-MM-DD
  note?: string
  ledgerId: string              // 所属账本
  createdAt: string
  updatedAt: string
  deletedAt?: string            // 软删除时间戳
}
```

### Ledger（账本）

```typescript
interface Ledger {
  id: string
  clientId?: string
  name: string
  icon?: string
  color?: string
  createdAt: string
  updatedAt: string
}
```

### User（用户）

```typescript
interface User {
  id: string
  phone: string                 // 手机号（主要标识）
  openid?: string               // 微信 openid
  nickname?: string
  avatar?: string
}
```

## 数据库设计

后端使用 **MySQL** + **Prisma ORM**：

- 用户通过 `phone` 字段作为主要标识和外键关联
- 支持软删除（`deletedAt` 字段）
- 记录和账本都有 `clientId` 用于客户端同步匹配

详见 `apps/backend/prisma/schema.prisma`

## API 概览

| 模块 | 端点 | 说明 |
|------|------|------|
| Auth | `/api/auth/wechat/login` | 微信登录 |
| Auth | `/api/auth/dev/login` | 开发登录 (body: `{openid}`) |
| Auth | `/api/auth/refresh` | 刷新令牌 |
| Records | `/api/records` | 记录 CRUD |
| Records | `/api/records/statistics` | 统计数据 |
| Records | `/api/records/monthly-trend` | 月度趋势 |
| Ledgers | `/api/ledgers` | 账本 CRUD |

**响应格式**：`{ code, message, data, timestamp }`

## 部署信息

| 服务 | 地址 |
|------|------|
| **后端 API（云托管）** | https://express-g8es-213254-5-1253552496.sh.run.tcloudbase.com |
| **云托管环境** | `prod-5gqmub7sd1872233` |
| **云托管服务名** | `express-g8es` |


## 子模块文档

| 模块 | 文档 | 说明 |
|------|------|------|
| **Web 前端** | [`apps/web/CODEBUDDY.md`](apps/web/CODEBUDDY.md) | React + TypeScript + Vite |
| **后端服务** | [`apps/backend/CODEBUDDY.md`](apps/backend/CODEBUDDY.md) | NestJS + Prisma + MySQL |
| **微信小程序** | [`apps/miniprogram/CODEBUDDY.md`](apps/miniprogram/CODEBUDDY.md) | 原生小程序 + TypeScript |
| **Flutter App** | [`apps/mobile/CODEBUDDY.md`](apps/mobile/CODEBUDDY.md) | Flutter + Provider |
| **HarmonyOS** | [`apps/harmony/CODEBUDDY.md`](apps/harmony/CODEBUDDY.md) | ArkTS + ArkUI |
| **Shared 包** | [`packages/shared/CODEBUDDY.md`](packages/shared/CODEBUDDY.md) | 类型、常量、工具 |
| **Business Logic** | [`packages/business-logic/CODEBUDDY.md`](packages/business-logic/CODEBUDDY.md) | 业务计算逻辑 |
