# Shared Package - 开发指南

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
   - 包含 `id`, `name`, `icon`, `color`, `createdAt`, `updatedAt`

3. **User** - 用户
   - 对应 Prisma `User` model
   - 后端特有字段（如 `openid`）仅在 Prisma 中定义

4. **RecordType** - 枚举
   - 对应 Prisma `enum RecordType`
   - 新增枚举值需两边同步

### 类型差异说明

| 字段 | TypeScript | Prisma | 说明 |
|------|------------|--------|------|
| `date` | `string` | `DateTime` | 前端用 ISO 字符串，后端用 DateTime |
| `amount` | `number` | `Decimal` | 后端使用 Decimal 保证精度 |
| `createdAt` | `string` | `DateTime` | 同上 |

### 同步后操作

修改 Prisma Schema 后需执行：

```bash
cd apps/backend
pnpm prisma generate    # 重新生成 Prisma Client
pnpm prisma db push     # 开发环境同步数据库（或使用 migrate）
```
