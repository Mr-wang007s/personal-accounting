# 微信小程序 - 详细指南

> 继承自 [根目录 CODEBUDDY.md](../../CODEBUDDY.md)，本文件提供小程序开发细节。

## 命令

```bash
# 开发
npm install             # 安装依赖
npm run tsc             # TypeScript 编译

# 使用微信开发者工具打开 apps/miniprogram 目录
```

## 技术栈

- **原生小程序** + **TypeScript**
- **自定义 TabBar** 底部导航
- **微信云托管** 后端服务
- **本地存储** wx.getStorageSync / wx.setStorageSync

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
│   ├── profile/                # 个人中心：登录、同步、账本管理
│   ├── category-detail/        # 分类详情统计
│   └── onboarding/             # 首次引导页
├── services/
│   ├── apiClient.ts            # HTTP 客户端（云托管）
│   ├── storage.ts              # 本地存储封装
│   ├── record.ts               # 记录服务
│   ├── ledger.ts               # 账本服务
│   └── sync.ts                 # 云端同步服务
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
| **我的** | `pages/profile` | 登录、同步设置、账本管理 |
| **分类详情** | `pages/category-detail` | 单分类记录列表 |
| **引导页** | `pages/onboarding` | 首次使用引导 |

## 状态管理

### 全局状态 (app.ts)

```typescript
// app.globalData
interface GlobalData {
  records: Record[]           // 记录列表
  ledgers: Ledger[]           // 账本列表
  currentLedgerId: string     // 当前账本 ID
  userProfile: UserProfile    // 用户信息
  syncState: SyncState        // 同步状态
}

// 获取全局状态
const app = getApp<IAppOption>()
app.globalData.records

// 更新后刷新页面
app.refreshCurrentPage()
```

### 页面数据流

```typescript
// 页面 onShow 时从全局状态同步
onShow() {
  const app = getApp<IAppOption>()
  this.setData({
    records: app.globalData.records,
    // ...
  })
}
```

## 服务层

### 存储服务 (storage.ts)

| Key | 说明 |
|-----|------|
| `pa_records` | 记录数据 |
| `pa_ledgers` | 账本数据 |
| `pa_user_profile` | 用户信息 |
| `pa_sync_meta` | 同步元数据 |

```typescript
import { storageService } from '../services/storage'

storageService.getRecords()
storageService.saveRecords(records)
```

### 同步服务 (sync.ts)

```typescript
import { syncService } from '../services/sync'

// 同步状态
syncService.getSyncState()  // 'idle' | 'syncing' | 'success' | 'error' | 'offline'

// 执行同步
await syncService.sync()

// 检查是否已登录
syncService.isAuthenticated()
```

**同步逻辑**：
1. 每条数据标记 `syncStatus: 'local' | 'synced'`
2. 联网时自动备份本地数据到云端
3. 联网时自动下载云端数据到本地
4. 删除已同步数据时，提示是否删除云端

### API 客户端 (apiClient.ts)

```typescript
import { apiClient } from '../services/apiClient'

// 云托管请求
await apiClient.get('/api/records')
await apiClient.post('/api/records', data)
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
| 云端同步 | ✅ | ✅ |
| 首次引导 | ✅ | ✅ |
| 微信登录 | ✅ | ❌ |
