# HarmonyOS 鸿蒙端 - 详细指南

> 继承自 [根目录 CODEBUDDY.md](../../CODEBUDDY.md)，本文件提供鸿蒙端开发细节。

## 命令

```bash
# 开发
# 使用 DevEco Studio 打开 apps/harmony 目录
# 或使用命令行工具

hvigorw assembleHap        # 构建 HAP 包
hvigorw assembleApp        # 构建 APP 包
```

## 技术栈

- **HarmonyOS 5.0** (API 12)
- **ArkTS** 声明式 UI
- **ArkUI** 组件库
- **@kit.ArkData** 数据持久化 (Preferences)
- **@kit.NetworkKit** 网络请求

## 目录结构

```
entry/src/main/
├── module.json5                    # 模块配置
├── ets/
│   ├── entryability/
│   │   └── EntryAbility.ets        # 应用入口 Ability
│   ├── pages/
│   │   ├── Index.ets               # 主页（底部导航容器）
│   │   ├── RecordsPage.ets         # 记录列表页
│   │   ├── StatisticsPage.ets      # 统计分析页
│   │   ├── ProfilePage.ets         # 个人中心页
│   │   └── RecordFormPage.ets      # 新增/编辑记录
│   ├── models/
│   │   ├── Record.ets              # 记录模型
│   │   ├── Category.ets            # 分类模型
│   │   ├── Ledger.ets              # 账本模型
│   │   └── index.ets               # 模型导出
│   ├── services/
│   │   ├── StorageService.ets      # 本地存储服务
│   │   ├── ApiService.ets          # HTTP 客户端
│   │   ├── RecordService.ets       # 记录业务服务
│   │   └── index.ets               # 服务导出
│   ├── viewmodels/
│   │   ├── RecordsViewModel.ets    # 记录状态管理
│   │   ├── LedgerViewModel.ets     # 账本状态管理
│   │   └── index.ets               # ViewModel 导出
│   ├── components/                 # 通用组件
│   └── common/
│       └── Constants.ets           # 常量、颜色、工具函数
└── resources/
    └── base/
        ├── element/
        │   ├── string.json         # 字符串资源
        │   └── color.json          # 颜色资源
        ├── media/                  # 图片资源
        └── profile/
            └── main_pages.json     # 页面路由配置
```

## 页面说明

| 页面 | 文件 | 功能 |
|------|------|------|
| **登录页** | `LoginPage.ets` | 手机号登录（简化版，只需输入手机号） |
| **主页** | `Index.ets` | 底部导航容器，包含明细/统计/我的三个 Tab |
| **记账** | `RecordFormPage.ets` | 新增/编辑收支表单 |
| **记录列表** | `RecordsPage.ets` | 月度账单、按日期分组 |
| **统计** | `StatisticsPage.ets` | 分类统计、进度条展示 |
| **个人中心** | `ProfilePage.ets` | 账本管理、同步设置 |

## 云托管配置

默认服务器地址（可在登录页面修改）：
```
https://pa-api-213254-5-1253552496.sh.run.tcloudbase.com/api
```

## 状态管理

### ViewModel 架构

使用 `@ObservedV2` + `@Trace` 实现响应式状态管理：

```typescript
@ObservedV2
export class RecordsViewModel {
  @Trace records: AccountRecord[] = []
  @Trace statistics: RecordStatistics = new RecordStatistics()
  @Trace isLoading: boolean = false
  
  async loadRecords(): Promise<void> {
    // ...
  }
}
```

### RecordsViewModel

```typescript
const recordsVM = new RecordsViewModel()

recordsVM.setLedgerId(ledgerId)     // 设置当前账本
recordsVM.loadRecords()             // 加载记录
recordsVM.loadStatistics()          // 加载统计
recordsVM.addRecord(data)           // 新增记录
recordsVM.updateRecord(id, data)    // 更新记录
recordsVM.deleteRecord(id)          // 删除记录
recordsVM.previousMonth()           // 上个月
recordsVM.nextMonth()               // 下个月
```

### LedgerViewModel

```typescript
const ledgerVM = new LedgerViewModel()

await ledgerVM.initialize(context)  // 初始化（必须先调用）
ledgerVM.ledgers                    // 账本列表
ledgerVM.currentLedger              // 当前账本
ledgerVM.switchLedger(id)           // 切换账本
ledgerVM.createLedger(name)         // 创建账本
ledgerVM.isLoggedIn                 // 是否已登录
```

## 服务层

### 存储服务 (StorageService)

基于 `@kit.ArkData` Preferences：

```typescript
import { storageService } from '../services'

// 初始化（在 LedgerViewModel.initialize 中调用）
await storageService.init(context)

// 认证相关
await storageService.getToken()
await storageService.saveToken(token)
await storageService.getPhone()
await storageService.savePhone(phone)
await storageService.getServerUrl()
await storageService.saveServerUrl(url)
await storageService.clearAuth()

// 记录操作
await storageService.getRecords()
await storageService.saveRecords(records)
await storageService.addRecord(record)
await storageService.updateRecord(id, updates)
await storageService.deleteRecord(id)

// 账本操作
await storageService.getLedgers()
await storageService.saveLedgers(ledgers)
await storageService.getCurrentLedgerId()
await storageService.setCurrentLedgerId(id)
```

### API 服务 (ApiService)

基于 `@kit.NetworkKit`：

```typescript
import { apiService } from '../services'

apiService.setBaseUrl('https://api.example.com')
apiService.setToken(token)

await apiService.get('/api/records')
await apiService.post('/api/records', data)
await apiService.put('/api/records/123', data)
await apiService.delete('/api/records/123')
await apiService.ping()  // 健康检查
```

### 记录服务 (RecordService)

```typescript
import { recordService } from '../services'

await recordService.getRecords(ledgerId, { type, category, startDate, endDate })
await recordService.createRecord({ type, amount, category, date, note, ledgerId })
await recordService.updateRecord(id, updates)
await recordService.deleteRecord(id)
await recordService.getStatistics(ledgerId, startDate, endDate)
await recordService.getCategoryStats(ledgerId, type, startDate, endDate)
await recordService.getMonthlyTrend(ledgerId, year)
```

## 数据模型

### AccountRecord

```typescript
class AccountRecord {
  id: string
  clientId?: string
  type: 'income' | 'expense'
  amount: number
  category: string
  date: string              // YYYY-MM-DD
  note?: string
  ledgerId: string
  createdAt: string
  updatedAt: string
  syncStatus: 'local' | 'synced'
}
```

### Category

与其他端保持一致：
- **支出 (10)**: 餐饮、交通、购物、娱乐、住房、医疗、教育、通讯、水电、其他
- **收入 (6)**: 工资、奖金、投资、兼职、退款、其他

```typescript
import { getCategoryById, getCategoriesByType, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../models'
```

## 导航

```typescript
import router from '@ohos.router'

// 跳转
router.pushUrl({ url: 'pages/RecordFormPage' })

// 带参数跳转
router.pushUrl({
  url: 'pages/RecordFormPage',
  params: { record: editingRecord }
})

// 获取参数
const params = router.getParams() as Record<string, Object>

// 返回
router.back()
```

## 主题颜色

```typescript
// common/Constants.ets
class AppColors {
  static readonly PRIMARY = '#6366F1'      // 主色调 Indigo
  static readonly SUCCESS = '#10B981'      // 收入绿色
  static readonly DANGER = '#EF4444'       // 支出红色
  static readonly BACKGROUND = '#F8FAFC'   // 背景色
  static readonly TEXT_PRIMARY = '#1E293B' // 主文字
  static readonly TEXT_SECONDARY = '#64748B' // 次要文字
}
```

## 与 Web/Mobile 功能对比

| 功能 | Harmony | Web | Mobile |
|------|:-------:|:---:|:------:|
| 记账 (收入/支出) | ✅ | ✅ | ✅ |
| 记录列表 | ✅ | ✅ | ✅ |
| 编辑/删除记录 | ✅ | ✅ | ✅ |
| 按日期分组 | ✅ | ✅ | ✅ |
| 月份切换 | ✅ | ✅ | ✅ |
| 统计概览 | ✅ | ✅ | ✅ |
| 分类统计 | ✅ | ✅ | ✅ |
| 多账本管理 | ✅ | ✅ | ✅ |
| 本地存储 | ✅ | ✅ | ✅ |
| 云端同步 | ✅ | ✅ | ✅ |
| 手机号登录 | ✅ | ✅ | ✅ |
| 深色模式 | 🚧 | ❌ | ✅ |

## 待完善功能

- [ ] 深色模式支持
- [ ] 图表可视化 (饼图、折线图)
- [ ] 首次引导页
- [ ] 华为账号登录
- [ ] 数据导出
