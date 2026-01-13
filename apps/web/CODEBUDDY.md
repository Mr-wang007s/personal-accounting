# Web Frontend - 详细指南

> 继承自 [根目录 CODEBUDDY.md](../../CODEBUDDY.md)，本文件提供前端开发细节。

## 命令

```bash
pnpm dev              # 开发服务器 http://localhost:5173
pnpm build            # 类型检查 + 生产构建
pnpm preview          # 预览生产构建
pnpm typecheck        # 仅类型检查

# E2E 测试 (Playwright)
pnpm test:e2e         # 无头模式
pnpm test:e2e:ui      # Playwright UI
pnpm test:e2e:headed  # 可见浏览器
```

## 技术栈

- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** + **shadcn/ui** (Radix UI)
- **Recharts** 数据可视化
- **Playwright** E2E 测试

## 目录结构

```
src/
├── App.tsx                    # 根组件，状态路由
├── main.tsx                   # 入口
├── lib/utils.ts               # 本地工具 (cn, formatCurrency)
├── context/
│   ├── RecordsContext.tsx     # 记录状态 + CRUD
│   ├── LedgerContext.tsx      # 账本状态管理
│   └── SyncContext.tsx        # 同步状态 + 自动同步
├── services/
│   ├── apiClient.ts           # HTTP 客户端
│   ├── ledgerService.ts       # 账本服务
│   └── recordService.ts       # 记录服务
├── pages/
│   ├── HomePage.tsx           # 首页：余额、快捷操作、最近记录
│   ├── RecordFormPage.tsx     # 新增/编辑收支
│   ├── RecordsPage.tsx        # 月度账单列表
│   ├── StatisticsPage.tsx     # 图表、分类统计
│   ├── ProfilePage.tsx        # 个人中心
│   └── OnboardingPage.tsx     # 首次引导
├── components/
│   ├── layout/                # BottomNav, Header, PageContainer
│   ├── common/                # CategoryIcon, EmptyState
│   ├── sync/                  # SyncSettings, SyncStatusBar
│   └── ui/                    # shadcn/ui 组件
└── e2e/
    └── accounting.spec.ts     # E2E 测试
```

## 状态管理

### RecordsContext

```typescript
const { records, statistics, addRecord, updateRecord, deleteRecord, refreshData } = useRecords()

// 新增记录
addRecord({ type: 'expense', amount: 100, category: 'food', date: '2025-01-01' })

// 更新记录
updateRecord(id, { amount: 200, category: 'transport' })

// 删除记录
deleteRecord(id)
```

### LedgerContext

```typescript
const { ledgers, currentLedger, switchLedger, createLedger, updateLedger, deleteLedger } = useLedger()

// 切换账本
switchLedger(ledgerId)

// 创建账本
createLedger({ name: '家庭账本', icon: 'home' })
```

### SyncContext

```typescript
const {
  syncState,           // 'idle' | 'syncing' | 'success' | 'error' | 'offline'
  isConnected,
  isAuthenticated,
  pendingCount,
  autoSyncEnabled,
  lastSyncResult,
  sync,
  discoverServer,
  login,
  setAutoSyncEnabled,
} = useSync()
```

- 变更后 3 秒自动同步（防抖）
- 网络恢复自动同步
- 双向 Diff 合并

## 导航

状态路由，无 URL：

```typescript
// App.tsx
const [currentPage, setCurrentPage] = useState('home')
// 页面: 'home' | 'income' | 'expense' | 'edit' | 'records' | 'statistics' | 'profile' | 'onboarding'

// 导航
onNavigate('records')

// 编辑记录
onEditRecord(record)  // 进入 'edit' 页面
```

## 路径别名

```typescript
import { Button } from '@/components/ui/button'                    // → src/components/ui/button
import type { Record } from '@personal-accounting/shared/types'    // → packages/shared/src/types
```

配置于 `vite.config.ts` 和 `tsconfig.json`。

## 同步服务

### localStorage Keys

| Key | 说明 |
|-----|------|
| `pa_records` | 记录数据 |
| `pa_ledgers` | 账本数据 |
| `pa_sync_meta` | 同步元数据 |
| `pa_pending_changes` | 待同步变更 |
| `pa_record_versions` | 记录版本追踪 |
| `pa_auto_sync` | 自动同步开关 |

### 冲突解决策略

```typescript
// 按时间戳决定
if (localUpdatedAt > serverUpdatedAt) {
  // 使用本地版本
} else {
  // 使用服务端版本
}
```

## 页面组件

| 页面 | Props | 说明 |
|------|-------|------|
| `HomePage` | `onNavigate` | 余额概览、快捷入口 |
| `RecordFormPage` | `type`, `onNavigate`, `editRecord?` | 新增/编辑表单 |
| `RecordsPage` | `onNavigate`, `onEditRecord` | 账单列表、月份切换 |
| `StatisticsPage` | `onNavigate` | 图表统计 |
| `ProfilePage` | `onNavigate` | 个人中心、账本管理 |
| `OnboardingPage` | `onComplete` | 首次使用引导 |

## E2E 测试

```bash
# 运行测试（需先启动 dev server）
pnpm test:e2e

# 调试单个测试
cd apps/web && npx playwright test e2e/accounting.spec.ts --grep "添加支出"
```

测试覆盖：记录 CRUD、导航、表单验证、数据持久化。

## 部署

**生产地址**: https://my-100-app-7g9jwge5b3870b6a-1253552496.tcloudbaseapp.com/

使用腾讯云 CloudBase 静态网站托管。
