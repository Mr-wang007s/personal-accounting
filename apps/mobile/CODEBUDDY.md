# Flutter Mobile - 详细指南

> 继承自 [根目录 CODEBUDDY.md](../../CODEBUDDY.md)，本文件提供 Flutter 移动端开发细节。

## 命令

```bash
# 开发
flutter pub get           # 安装依赖
flutter run               # 运行应用 (需连接设备/模拟器)
flutter run -d chrome     # Web 调试

# 构建
flutter build apk         # Android APK
flutter build ios         # iOS (需 macOS)

# 代码质量
flutter analyze           # 静态分析
flutter test              # 单元测试
```

## 技术栈

- **Flutter 3.x** + **Dart**
- **Provider** 状态管理
- **Dio** HTTP 客户端
- **fl_chart** 数据可视化
- **shared_preferences** 本地存储
- **sqflite** SQLite 数据库 (预留)

## 目录结构

```
lib/
├── main.dart                   # 应用入口
├── models/
│   ├── record.dart             # 记录模型
│   ├── category.dart           # 分类模型
│   ├── ledger.dart             # 账本模型
│   └── user.dart               # 用户模型
├── providers/
│   ├── auth_provider.dart      # 认证状态
│   ├── ledger_provider.dart    # 账本状态
│   └── records_provider.dart   # 记录状态
├── screens/
│   ├── splash_screen.dart      # 启动页
│   ├── login_screen.dart       # 登录页
│   ├── home_screen.dart        # 主页（底部导航容器）
│   ├── add_record_screen.dart  # 新增/编辑记录
│   ├── records_screen.dart     # 记录列表
│   ├── record_detail_screen.dart # 记录详情
│   ├── statistics_screen.dart  # 统计分析
│   └── profile_screen.dart     # 个人中心
├── services/
│   ├── api_service.dart        # HTTP 客户端
│   ├── auth_service.dart       # 认证服务
│   ├── record_service.dart     # 记录服务
│   ├── storage_service.dart    # 本地存储
│   └── sync_service.dart       # 同步服务
├── theme/
│   └── app_theme.dart          # 主题配置（亮/暗）
└── widgets/
    ├── record_list_item.dart   # 记录列表项
    └── summary_card.dart       # 统计卡片
```

## 页面说明

| 页面 | 文件 | 功能 |
|------|------|------|
| **启动页** | `splash_screen.dart` | 初始化、自动登录检查 |
| **登录页** | `login_screen.dart` | 手机号登录 |
| **主页** | `home_screen.dart` | 底部导航容器 (记录/统计/我的) |
| **记账** | `add_record_screen.dart` | 新增/编辑收支表单 |
| **记录列表** | `records_screen.dart` | 月度账单、筛选 |
| **记录详情** | `record_detail_screen.dart` | 查看/编辑/删除记录 |
| **统计** | `statistics_screen.dart` | 饼图、折线图、分类统计 |
| **个人中心** | `profile_screen.dart` | 账本管理、同步、设置 |

## 状态管理

### Provider 架构

```dart
// main.dart
MultiProvider(
  providers: [
    ChangeNotifierProvider(create: (_) => AuthProvider()),
    ChangeNotifierProvider(create: (_) => LedgerProvider()),
    ChangeNotifierProvider(create: (_) => RecordsProvider()),
  ],
  child: MaterialApp(...),
)
```

### AuthProvider

```dart
final auth = context.watch<AuthProvider>();

auth.isLoggedIn          // 是否已登录
auth.user                // 当前用户
auth.login(phone, code)  // 登录
auth.logout()            // 登出
```

### LedgerProvider

```dart
final ledger = context.watch<LedgerProvider>();

ledger.ledgers           // 账本列表
ledger.currentLedger     // 当前账本
ledger.switchLedger(id)  // 切换账本
ledger.createLedger()    // 创建账本
```

### RecordsProvider

```dart
final records = context.watch<RecordsProvider>();

records.records          // 记录列表
records.statistics       // 统计数据
records.isLoading        // 加载状态

records.loadRecords()    // 加载记录
records.addRecord(...)   // 新增
records.updateRecord()   // 更新
records.deleteRecord()   // 删除
records.getMonthlyStats()// 月度统计
```

## 服务层

### API 服务 (api_service.dart)

```dart
final api = ApiService();

// 配置
api.setBaseUrl('https://api.example.com');
api.setToken(token);

// 请求
await api.get('/records');
await api.post('/records', data: {...});
await api.put('/records/$id', data: {...});
await api.delete('/records/$id');
```

### 存储服务 (storage_service.dart)

```dart
final storage = StorageService();

await storage.getToken();
await storage.setToken(token);
await storage.getCurrentLedgerId();
await storage.setCurrentLedgerId(id);
await storage.clear();
```

### 记录服务 (record_service.dart)

```dart
final service = RecordService();

await service.getRecords(ledgerId, page: 1, pageSize: 20);
await service.createRecord(record);
await service.updateRecord(id, record);
await service.deleteRecord(id);
await service.getStatistics(ledgerId, startDate, endDate);
await service.getMonthlyTrend(ledgerId, year);
await service.getCategoryStats(ledgerId, startDate, endDate);
```

## 数据模型

### Record

```dart
class Record {
  final String id;
  final String? clientId;
  final RecordType type;      // income | expense
  final double amount;
  final String category;
  final DateTime date;
  final String? note;
  final String ledgerId;
  final DateTime createdAt;
  final DateTime updatedAt;
}
```

### Category

```dart
// 支出分类 (10)
ExpenseCategory.food        // 餐饮
ExpenseCategory.transport   // 交通
ExpenseCategory.shopping    // 购物
// ...

// 收入分类 (6)
IncomeCategory.salary       // 工资
IncomeCategory.bonus        // 奖金
// ...
```

## 主题

```dart
// 自动跟随系统
themeMode: ThemeMode.system

// 亮色主题
AppTheme.lightTheme

// 暗色主题
AppTheme.darkTheme
```

**主色调**: Indigo (#6366F1)

## 导航

```dart
// 跳转
Navigator.push(context, MaterialPageRoute(
  builder: (_) => AddRecordScreen(type: RecordType.expense),
));

// 返回
Navigator.pop(context);

// 返回并传值
Navigator.pop(context, result);

// 替换
Navigator.pushReplacement(context, MaterialPageRoute(...));
```

## 与 Web 功能对比

| 功能 | Mobile | Web |
|------|:------:|:---:|
| 记账 (收入/支出) | ✅ | ✅ |
| 记录列表 | ✅ | ✅ |
| 编辑/删除记录 | ✅ | ✅ |
| 筛选 (类型/分类/日期) | ✅ | ✅ |
| 统计概览 | ✅ | ✅ |
| 分类统计 (饼图) | ✅ | ✅ |
| 月度趋势 (折线图) | ✅ | ✅ |
| 多账本管理 | ✅ | ✅ |
| 云端同步 | ✅ | ✅ |
| 深色模式 | ✅ | ❌ |
| 启动页 | ✅ | ❌ |
| 独立登录页 | ✅ | ❌ |
| 记录详情页 | ✅ | ❌ |
| 首次引导 | ❌ | ✅ |
| 离线优先 | ❌ | ✅ |

## 待完善功能

- [ ] 首次引导页 (OnboardingScreen)
- [ ] 离线缓存支持
- [ ] 本地数据库 (sqflite)
- [ ] 推送通知
