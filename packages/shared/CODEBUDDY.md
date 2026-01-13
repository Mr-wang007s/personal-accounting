# Shared Package - 开发指南

> 继承自 [根目录 CODEBUDDY.md](../../CODEBUDDY.md)

本包提供跨端共享的类型定义、常量和工具函数。

## 目录结构

```
src/
├── index.ts              # 入口，导出所有模块
├── types/index.ts        # 类型定义
├── constants/index.ts    # 常量定义
└── utils/index.ts        # 工具函数
```

## 导出内容

### 类型 (`types`)

```typescript
import type {
  Record,           // 记账记录
  Category,         // 分类
  Ledger,           // 账本
  User,             // 用户
  Statistics,       // 统计数据
  DateRange,        // 日期范围
  RecordType,       // 'income' | 'expense'
  ApiResponse,      // API 响应格式
  PaginatedResponse // 分页响应
} from '@personal-accounting/shared/types'
```

### 常量 (`constants`)

```typescript
import {
  EXPENSE_CATEGORIES,  // 支出分类 (10 个)
  INCOME_CATEGORIES,   // 收入分类 (6 个)
  CHART_COLORS,        // 图表颜色
  getCategoryById,     // 按 ID 获取分类
  getCategoriesByType  // 按类型获取分类列表
} from '@personal-accounting/shared/constants'
```

**分类定义**：
- 支出 (10): 餐饮、交通、购物、娱乐、住房、医疗、教育、通讯、水电、其他
- 收入 (6): 工资、奖金、投资、兼职、退款、其他

### 工具函数 (`utils`)

```typescript
import {
  generateId,       // 生成 cuid
  formatCurrency,   // 格式化金额 (¥1,234.56)
  formatDate,       // 格式化日期
  getMonthRange,    // 获取月份起止日期
  dayjs             // dayjs 实例
} from '@personal-accounting/shared/utils'
```

## 类型同步规则

**重要**: `types/index.ts` 中的类型定义需要与后端 Prisma Schema 保持同步。

### 同步映射关系

| TypeScript 类型 | Prisma Model | 说明 |
|----------------|--------------|------|
| `Record` | `Record` | 记账记录 |
| `Ledger` | `Ledger` | 账本 |
| `User` | `User` | 用户 |
| `RecordType` | `RecordType` | 记录类型枚举 |

### 修改流程

当修改 `types/index.ts` 中的以下类型时，**必须同步修改** `apps/backend/prisma/schema.prisma`：

1. **Record** - 记账记录
   - 新增/删除字段需同步到 Prisma `Record` model
   - 字段类型变更需确保 Prisma 类型兼容

2. **Ledger** - 账本
   - 对应 Prisma `Ledger` model
   - 包含 `id`, `name`, `icon`, `color`, `clientId`, `createdAt`, `updatedAt`

3. **User** - 用户
   - 对应 Prisma `User` model
   - 后端特有字段（如 `openid`, `password`）仅在 Prisma 中定义

4. **RecordType** - 枚举
   - 对应 Prisma `enum RecordType`
   - 新增枚举值需两边同步

### 类型差异说明

| 字段 | TypeScript | Prisma | 说明 |
|------|------------|--------|------|
| `date` | `string` | `DateTime` | 前端用 ISO 字符串，后端用 DateTime |
| `amount` | `number` | `Decimal(10,2)` | 后端使用 Decimal 保证精度 |
| `createdAt` | `string` | `DateTime` | 同上 |
| `note` | `string?` | `String? @db.Text` | 后端使用 Text 类型 |

### 同步后操作

修改 Prisma Schema 后需执行：

```bash
cd apps/backend
pnpm prisma generate    # 重新生成 Prisma Client
pnpm prisma db push     # 开发环境同步数据库（或使用 migrate）
```

## 跨端使用

### Web / Backend (直接引用)

```typescript
import { EXPENSE_CATEGORIES } from '@personal-accounting/shared/constants'
import type { Record } from '@personal-accounting/shared/types'
```

### 小程序 / Flutter / HarmonyOS (本地复制)

由于平台限制，这些端需要将 shared 代码复制到本地：

| 端 | 本地路径 | 说明 |
|---|---------|------|
| 小程序 | `miniprogram/shared/` | TypeScript 复制 |
| Flutter | `lib/models/` | Dart 重新实现 |
| HarmonyOS | `ets/models/` | ArkTS 重新实现 |

**注意**：修改 shared 包后，需要同步更新各端的本地代码。
