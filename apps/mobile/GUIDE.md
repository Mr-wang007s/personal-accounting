# Flutter Mobile - 开发调试指南

本文档提供 Flutter 移动端应用的开发环境搭建、调试技巧和体验指南。

## 目录

- [环境准备](#环境准备)
- [快速开始](#快速开始)
- [开发调试](#开发调试)
- [真机调试](#真机调试)
- [构建发布](#构建发布)
- [常见问题](#常见问题)

---

## 环境准备

### 1. 安装 Flutter SDK

**Windows:**
```powershell
# 下载 Flutter SDK
# https://docs.flutter.dev/get-started/install/windows

# 添加到环境变量
$env:Path += ";C:\flutter\bin"

# 验证安装
flutter doctor
```

**macOS:**
```bash
# 使用 Homebrew
brew install --cask flutter

# 或手动下载
# https://docs.flutter.dev/get-started/install/macos

# 验证安装
flutter doctor
```

### 2. 配置 Android 开发环境

1. 安装 [Android Studio](https://developer.android.com/studio)
2. 打开 SDK Manager，安装：
   - Android SDK Platform (API 34 推荐)
   - Android SDK Build-Tools
   - Android SDK Command-line Tools
   - Android Emulator
3. 创建模拟器：
   - 打开 Device Manager
   - 点击 "Create Device"
   - 选择 Pixel 设备，下载 API 34 镜像

### 3. 配置 iOS 开发环境 (仅 macOS)

```bash
# 安装 Xcode
xcode-select --install

# 配置 Xcode
sudo xcodebuild -license accept

# 安装 CocoaPods
sudo gem install cocoapods
```

### 4. 验证环境

```bash
flutter doctor -v
```

确保所有项目都显示 ✓ 或只有你不需要的平台显示 ✗。

---

## 快速开始

### 1. 安装依赖

```bash
cd apps/mobile
flutter pub get
```

### 2. 启动应用

```bash
# 列出可用设备
flutter devices

# 启动到默认设备
flutter run

# 指定设备
flutter run -d <device_id>

# Web 调试（无需设备）
flutter run -d chrome
```

### 3. 配置服务器

首次启动后，在登录页面：
1. 点击右上角设置图标
2. 输入服务器地址：`https://express-g8es-213254-5-1253552496.sh.run.tcloudbase.com/api`
3. 点击"测试连接"验证
4. 使用手机号登录

---

## 开发调试

### Hot Reload (热重载)

开发过程中，修改代码后：
- 按 `r` 键：Hot Reload（保留状态，刷新 UI）
- 按 `R` 键：Hot Restart（重启应用，重置状态）
- 按 `q` 键：退出

### VS Code 调试

1. 安装 Flutter 扩展
2. 打开 `apps/mobile` 目录
3. 按 `F5` 启动调试
4. 设置断点、查看变量

**launch.json 配置：**
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "mobile",
      "cwd": "apps/mobile",
      "request": "launch",
      "type": "dart"
    },
    {
      "name": "mobile (profile mode)",
      "cwd": "apps/mobile",
      "request": "launch",
      "type": "dart",
      "flutterMode": "profile"
    }
  ]
}
```

### Android Studio 调试

1. 打开 `apps/mobile` 目录
2. 选择目标设备
3. 点击 Run 或 Debug 按钮
4. 使用 Flutter Inspector 查看 Widget 树

### 调试命令

```bash
# 打印日志
flutter logs

# 性能分析
flutter run --profile

# 查看 Widget 树
# 运行时按 'w' 键

# 检查重绘区域
# 运行时按 'p' 键

# 切换调试绘制
# 运行时按 'o' 键
```

### 网络请求调试

应用内置了请求日志，在控制台可看到：
```
[API] POST /api/auth/phone/login
[API] Response: 200
```

使用 Charles 或 Proxyman 进行更详细的网络抓包。

---

## 真机调试

### Android 真机

1. **开启开发者选项**
   - 设置 → 关于手机 → 连续点击"版本号"7次
   - 设置 → 开发者选项 → 开启 USB 调试

2. **连接设备**
   ```bash
   # 检查设备连接
   adb devices
   
   # 运行到真机
   flutter run
   ```

3. **无线调试 (Android 11+)**
   ```bash
   # 开启无线调试后
   adb pair <ip>:<port>
   adb connect <ip>:<port>
   flutter run
   ```

### iOS 真机 (仅 macOS)

1. **配置开发者证书**
   - 打开 Xcode
   - Preferences → Accounts → 添加 Apple ID
   - 选择 Personal Team

2. **配置项目签名**
   ```bash
   cd apps/mobile/ios
   open Runner.xcworkspace
   ```
   - 选择 Runner 项目
   - Signing & Capabilities → Team 选择你的开发者账号

3. **信任开发者**
   - iPhone 设置 → 通用 → VPN与设备管理 → 信任你的证书

4. **运行**
   ```bash
   flutter run -d <iphone_device_id>
   ```

---

## 构建发布

### Android APK

```bash
# Debug APK
flutter build apk --debug

# Release APK
flutter build apk --release

# 分架构 APK（体积更小）
flutter build apk --split-per-abi

# 输出位置
# build/app/outputs/flutter-apk/
```

### Android App Bundle (推荐)

```bash
flutter build appbundle --release
# 输出: build/app/outputs/bundle/release/app-release.aab
```

### iOS IPA (仅 macOS)

```bash
# 需要有效的开发者证书
flutter build ios --release

# 然后在 Xcode 中归档
# Product → Archive → Distribute App
```

### 版本号管理

编辑 `pubspec.yaml`：
```yaml
version: 1.0.0+1
# 格式: major.minor.patch+buildNumber
```

---

## 常见问题

### 1. Flutter doctor 报错

**问题：** Android license 未接受
```bash
flutter doctor --android-licenses
# 然后输入 y 接受所有协议
```

**问题：** CocoaPods 未安装
```bash
sudo gem install cocoapods
pod setup
```

### 2. 依赖安装失败

```bash
# 清除缓存重试
flutter clean
flutter pub cache repair
flutter pub get
```

### 3. 模拟器启动慢

- 开启 CPU 虚拟化 (BIOS 中启用 VT-x/AMD-V)
- 使用 x86_64 镜像而非 ARM
- 分配更多内存给模拟器

### 4. iOS 编译失败

```bash
cd apps/mobile/ios
pod deintegrate
pod install --repo-update
cd ..
flutter clean
flutter run
```

### 5. 热重载不生效

某些修改需要 Hot Restart：
- 修改 `main()` 函数
- 修改静态字段的初始值
- 修改泛型类型
- 添加/删除依赖

### 6. 网络请求失败

**Android 明文流量限制：**
编辑 `android/app/src/main/AndroidManifest.xml`：
```xml
<application
    android:usesCleartextTraffic="true"
    ...>
```

**iOS ATS 限制：**
编辑 `ios/Runner/Info.plist`：
```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>
```

### 7. 状态丢失

Provider 状态在 Hot Restart 后会重置，这是正常行为。如需持久化，使用 `shared_preferences` 或 `sqflite`。

---

## 调试技巧

### 1. 打印调试

```dart
import 'package:flutter/foundation.dart';

// 仅在 Debug 模式打印
debugPrint('Variable value: $value');

// 条件断点日志
if (kDebugMode) {
  print('Debug info: $data');
}
```

### 2. 性能监控

```dart
// 启用性能覆盖层
MaterialApp(
  showPerformanceOverlay: true,
  ...
)
```

### 3. 布局调试

```dart
// 显示所有 Widget 边界
debugPaintSizeEnabled = true;

// 显示基线
debugPaintBaselinesEnabled = true;
```

### 4. 错误边界

```dart
Widget build(BuildContext context) {
  return ErrorBoundary(
    child: MyWidget(),
    onError: (error, stack) {
      // 上报错误
    },
  );
}
```

---

## 推荐工具

| 工具 | 用途 |
|------|------|
| [DevTools](https://docs.flutter.dev/tools/devtools) | Flutter 官方调试工具 |
| [Charles](https://www.charlesproxy.com/) | 网络抓包 |
| [Proxyman](https://proxyman.io/) | macOS 网络调试 |
| [scrcpy](https://github.com/Genymobile/scrcpy) | Android 投屏 |
| [FlutterGen](https://pub.dev/packages/flutter_gen) | 资源代码生成 |

---

## 体验流程

完整体验应用功能：

1. **启动应用** → 进入启动页
2. **登录** → 输入手机号，点击登录
3. **首页** → 查看本月收支概览
4. **记账** → 点击 + 按钮，添加一笔支出
5. **账单** → 查看记录列表，点击编辑或删除
6. **统计** → 查看分类饼图和趋势图
7. **个人中心** → 管理账本、查看同步状态
8. **切换账本** → 新建账本并切换
9. **深色模式** → 跟随系统自动切换

---

## 相关资源

- [Flutter 官方文档](https://docs.flutter.dev/)
- [Dart 语言文档](https://dart.dev/guides)
- [Provider 状态管理](https://pub.dev/packages/provider)
- [Dio HTTP 客户端](https://pub.dev/packages/dio)
- [项目 API 文档](../../apps/backend/CODEBUDDY.md)
