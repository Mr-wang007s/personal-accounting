# 微信小程序 - 详细指南

> 继承自 [根目录 CODEBUDDY.md](../../CODEBUDDY.md)，本文件提供小程序开发细节。

## 命令

```bash
# 开发
npm install             # 安装依赖

# 使用微信开发者工具打开 apps/miniprogram 目录
```

## 技术栈

- **原生小程序** + **TypeScript**
- **自定义 TabBar** 底部导航
- **微信云托管** 后端服务
- **纯云端数据** 所有数据直接通过 API 操作，无本地存储

## 目录结构

```
miniprogram/
├── app.ts                      # 应用入口，全局状态
├── app.json                    # 应用配置
├── app.wxss                    # 全局样式
├── pages/
│   ├── index/                  # 首页：余额、快捷记账、最近记录
│   ├── records/                # 账单列表：月份切换、筛选、统计
│   ├── record/                 # 新增/编辑记录表单
│   ├── profile/                # 个人中心：登录、账本管理
│   ├── category-detail/        # 分类详情统计
│   └── onboarding/             # 首次引导页
├── services/
│   ├── apiClient.ts            # HTTP 客户端（云托管）+ CRUD API
│   ├── auth.ts                 # 认证服务
│   ├── record.ts               # 记录服务（调用 API）
│   └── ledger.ts               # 账本服务（调用 API）
├── shared/
│   ├── types.ts                # 类型定义
│   ├── constants.ts            # 分类、存储键等常量
│   └── utils.ts                # 工具函数
├── business-logic/
│   ├── records.ts              # 记录计算逻辑
│   └── statistics.ts           # 统计计算逻辑
├── components/
│   └── icon/                   # 图标组件
├── custom-tab-bar/             # 自定义底部导航
└── assets/icons/               # 图标资源
```

## 页面说明

| 页面 | 路径 | 功能 |
|------|------|------|
| **首页** | `pages/index` | 余额卡片、快捷记账入口、最近记录 |
| **账单** | `pages/records` | 月度账单列表、筛选、分类统计图表 |
| **记账** | `pages/record` | 新增/编辑收支表单 |
| **我的** | `pages/profile` | 登录、账本管理 |
| **分类详情** | `pages/category-detail` | 单分类记录列表 |
| **引导页** | `pages/onboarding` | 首次使用引导 |

## 数据架构（重构后）

### 核心原则

**所有数据直接通过云端 API 操作，不使用本地存储**

- 增删改查操作直接调用 API
- 数据一致性由云端保证
- globalData 仅作为内存缓存，用于页面间数据共享

### 全局状态 (app.ts)

```typescript
// app.globalData - 内存缓存
interface GlobalData {
  records: Record[]           // 记录列表（从云端加载）
  ledgers: Ledger[]           // 账本列表（从云端加载）
  currentLedger: Ledger       // 当前账本
  userProfile: UserProfile    // 用户信息
  isInitialized: boolean      // 是否已初始化
  isLoggedIn: boolean         // 是否已登录
}

// 获取全局状态
const app = getApp<IAppOption>()
app.globalData.records

// 刷新数据（从云端重新加载）
await app.refreshData()
```

### 数据流

```
┌─────────────────────────────────────────────────────────────┐
│                      微信云托管后端                          │
│                    (PostgreSQL 数据库)                       │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │ API 请求
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      ApiClient                              │
│  - createRecord / updateRecord / deleteRecord               │
│  - createLedger / updateLedger / deleteLedger               │
│  - getAllData (获取所有账本和记录)                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              RecordService / LedgerService                  │
│                    业务逻辑层                                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      App.globalData                         │
│  userProfile, currentLedger, ledgers, records               │
│  (内存缓存，页面间共享)                                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        各个页面                              │
│  通过 getApp().globalData 访问缓存数据                        │
│  通过 app.refreshData() 从云端刷新数据                        │
└─────────────────────────────────────────────────────────────┘
```

## 服务层

### API 客户端 (apiClient.ts)

```typescript
import { apiClient } from '../services/apiClient'

// 记录 CRUD
await apiClient.createRecord(data)
await apiClient.updateRecord(clientId, updates)
await apiClient.deleteRecord(clientId)
await apiClient.getRecords()

// 账本 CRUD
await apiClient.createLedger(data)
await apiClient.updateLedger(clientId, updates)
await apiClient.deleteLedger(clientId)
await apiClient.getLedgers()

// 获取所有数据
await apiClient.getAllData()  // 返回 { ledgers, records }
```

### 认证服务 (auth.ts)

```typescript
import { authService } from '../services/auth'

// 自动登录
await authService.autoLogin(nickname?, avatar?)

// 检查登录状态
authService.isLoggedIn()

// 登出
authService.logout()
```

### 记录服务 (record.ts)

```typescript
import { RecordService } from '../services/record'

// 添加记录（调用 API）
await RecordService.addRecord({ type, amount, category, date, ledgerId })

// 更新记录（调用 API）
await RecordService.updateRecord(id, updates)

// 删除记录（调用 API）
await RecordService.deleteRecord(id)

// 获取记录（从 globalData 缓存）
RecordService.getRecordsByLedger(ledgerId)
RecordService.getRecordsByMonth(ledgerId, year, month)
```

### 账本服务 (ledger.ts)

```typescript
import { LedgerService } from '../services/ledger'

// 创建账本（调用 API）
await LedgerService.createLedger(name, icon)

// 更新账本（调用 API）
await LedgerService.updateLedger(ledgerId, updates)

// 删除账本（调用 API）
await LedgerService.deleteLedger(ledgerId)

// 获取账本（从 globalData 缓存）
LedgerService.getLedgers()
LedgerService.getCurrentLedger()

// 切换账本（更新 globalData）
LedgerService.switchLedger(ledgerId)
```

## 分类定义

与 Web/Mobile 保持一致：

- **支出 (10)**: 餐饮、交通、购物、娱乐、住房、医疗、教育、通讯、水电、其他
- **收入 (6)**: 工资、奖金、投资、兼职、退款、其他

```typescript
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, getCategoryById } from '../shared/constants'
```

## 导航

```typescript
// 跳转页面
wx.navigateTo({ url: '/pages/record/record?type=expense' })

// 返回
wx.navigateBack()

// 切换 Tab
wx.switchTab({ url: '/pages/index/index' })
```

## 与 Web 功能对比

| 功能 | 小程序 | Web |
|------|:------:|:---:|
| 记账 (收入/支出) | ✅ | ✅ |
| 记录列表 | ✅ | ✅ |
| 编辑/删除记录 | ✅ | ✅ |
| 筛选 (类型/分类/日期) | ✅ | ✅ |
| 统计概览 | ✅ | ✅ |
| 分类统计 | ✅ | ✅ |
| 月度趋势 | ✅ | ✅ |
| 多账本管理 | ✅ | ✅ |
| 云端数据 | ✅ | ✅ |
| 首次引导 | ✅ | ✅ |
| 微信登录 | ✅ | ❌ |
