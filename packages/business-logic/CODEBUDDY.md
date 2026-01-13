# Business Logic Package - 开发指南

> 继承自 [根目录 CODEBUDDY.md](../../CODEBUDDY.md)

本包提供纯计算逻辑，无副作用，可在 Web 和 Backend 复用。

## 目录结构

```
src/
├── index.ts              # 入口，导出所有模块
├── records/index.ts      # 记录计算器
└── statistics/index.ts   # 统计服务
```

## 命令

```bash
pnpm build        # 构建
pnpm dev          # 开发模式（watch）
pnpm typecheck    # 类型检查
pnpm test         # 运行测试
pnpm test:watch   # 测试监听模式
```

## 导出内容

### RecordCalculator (`records`)

记录计算相关的纯函数：

```typescript
import { RecordCalculator } from '@personal-accounting/business-logic/records'

// 余额计算
RecordCalculator.calculateBalance(records)        // 收入 - 支出
RecordCalculator.calculateTotalIncome(records)    // 总收入
RecordCalculator.calculateTotalExpense(records)   // 总支出

// 分类统计
RecordCalculator.getCategoryBreakdown(records)    // 按分类汇总
// 返回: { categoryId: { category, amount, count, percentage } }

// 趋势分析
RecordCalculator.getMonthlyTrend(records, year)   // 年度月度趋势
// 返回: [{ month, income, expense, balance }]

// 筛选与排序
RecordCalculator.filterByDateRange(records, startDate, endDate)
RecordCalculator.filterByType(records, type)
RecordCalculator.filterByCategory(records, categoryId)
RecordCalculator.sortByDate(records, order)       // 'asc' | 'desc'

// 分组
RecordCalculator.groupByDate(records)             // 按日期分组
// 返回: { 'YYYY-MM-DD': Record[] }
RecordCalculator.groupByMonth(records)            // 按月份分组
// 返回: { 'YYYY-MM': Record[] }
```

### StatisticsService (`statistics`)

统计服务，提供更高层的统计接口：

```typescript
import { StatisticsService } from '@personal-accounting/business-logic/statistics'

// 基础统计
StatisticsService.getStatistics(records, dateRange?)
// 返回: { totalIncome, totalExpense, balance, recordCount }

// 月度统计
StatisticsService.getMonthlyStatistics(records, year, month)
// 返回: { ...基础统计, categoryBreakdown, dailyTrend }

// 年度统计
StatisticsService.getYearlyStatistics(records, year)
// 返回: { ...基础统计, monthlyTrend, topCategories }

// 对比统计
StatisticsService.compareStatistics(current, previous)
// 返回: { incomeChange, expenseChange, balanceChange, changePercent }
```

## 使用示例

### 在 Web 前端使用

```typescript
// apps/web/src/context/RecordsContext.tsx
import { RecordCalculator } from '@personal-accounting/business-logic/records'
import { StatisticsService } from '@personal-accounting/business-logic/statistics'

const statistics = StatisticsService.getStatistics(records, {
  startDate: dayjs().startOf('month').format('YYYY-MM-DD'),
  endDate: dayjs().endOf('month').format('YYYY-MM-DD')
})

const categoryBreakdown = RecordCalculator.getCategoryBreakdown(
  records.filter(r => r.type === 'expense')
)
```

### 在 Backend 使用

```typescript
// apps/backend/src/records/records.service.ts
import { RecordCalculator } from '@personal-accounting/business-logic/records'

async getStatistics(userId: string, startDate: Date, endDate: Date) {
  const records = await this.prisma.record.findMany({
    where: { userId, date: { gte: startDate, lte: endDate } }
  })
  
  return RecordCalculator.getCategoryBreakdown(records)
}
```

## 设计原则

1. **纯函数**: 所有函数无副作用，相同输入始终返回相同输出
2. **无 I/O**: 不涉及网络请求、数据库操作、文件读写
3. **类型安全**: 完整的 TypeScript 类型定义
4. **可测试**: 易于单元测试

## 依赖

```json
{
  "dependencies": {
    "@personal-accounting/shared": "workspace:*"
  }
}
```

仅依赖 shared 包的类型定义和工具函数。
