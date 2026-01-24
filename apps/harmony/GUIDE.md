# HarmonyOS 鸿蒙端 - 开发调试指南

本文档提供鸿蒙端应用的开发环境搭建、调试技巧和体验指南。

## 目录

- [环境准备](#环境准备)
- [快速开始](#快速开始)
- [开发调试](#开发调试)
- [真机调试](#真机调试)
- [构建发布](#构建发布)
- [常见问题](#常见问题)

---

## 环境准备

### 1. 安装 DevEco Studio

1. 下载 [DevEco Studio](https://developer.huawei.com/consumer/cn/deveco-studio/)
   - 推荐版本：DevEco Studio 5.0.0 或更高
   - 支持 HarmonyOS 5.0 (API 12)

2. 安装完成后启动，首次配置：
   - 选择 "Do not import settings"
   - 同意许可协议
   - 选择 SDK 安装路径
   - 等待 SDK 下载完成

### 2. 配置 SDK

1. 打开 DevEco Studio
2. File → Settings → SDK
3. 确保安装了：
   - HarmonyOS SDK (API 12)
   - ArkTS SDK
   - Native SDK (可选)

### 3. 配置环境变量 (可选)

**Windows:**
```powershell
# 添加到系统环境变量
$env:HOS_SDK_HOME = "C:\Users\<username>\AppData\Local\Huawei\Sdk"
$env:Path += ";$env:HOS_SDK_HOME\toolchains"
```

**macOS:**
```bash
export HOS_SDK_HOME=~/Library/Huawei/Sdk
export PATH=$PATH:$HOS_SDK_HOME/toolchains
```

### 4. 验证环境

```bash
# 检查 hvigor (构建工具)
hvigorw --version

# 检查 SDK
ls $HOS_SDK_HOME
```

---

## 快速开始

### 1. 打开项目

1. 启动 DevEco Studio
2. File → Open → 选择 `apps/harmony` 目录
3. 等待项目同步完成（右下角进度条）

### 2. 同步依赖

如果依赖未自动同步：
```bash
cd apps/harmony
ohpm install
```

或在 DevEco Studio 中：
- 右键 `oh-package.json5` → Sync Project

### 3. 运行到模拟器

1. 点击顶部工具栏的设备选择器
2. 选择 "Device Manager"
3. 创建新模拟器：
   - 选择设备类型（Phone/Tablet）
   - 选择 HarmonyOS 版本
   - 完成创建并启动
4. 点击 Run 按钮 (▶)

### 4. 配置服务器

首次启动后，在登录页面：
1. 点击"服务器设置"
2. 输入服务器地址：`https://express-g8es-213254-5-1253552496.sh.run.tcloudbase.com/api`
3. 点击"测试连接"
4. 使用手机号登录

---

## 开发调试

### DevEco Studio 调试

1. **断点调试**
   - 点击代码行号左侧设置断点
   - 点击 Debug 按钮 (🐞)
   - 使用调试工具栏：继续、步过、步入、步出

2. **日志查看**
   - 底部 Log 面板
   - 过滤：`hilog` / `app` / 自定义 tag
   - 搜索关键字快速定位

3. **ArkUI Inspector**
   - View → Tool Windows → ArkUI Inspector
   - 实时查看组件树
   - 检查组件属性
   - 定位布局问题

### 日志输出

```typescript
import hilog from '@ohos.hilog'

const TAG = 'MyPage'
const DOMAIN = 0x0000

// 不同级别日志
hilog.debug(DOMAIN, TAG, 'Debug message: %{public}s', 'value')
hilog.info(DOMAIN, TAG, 'Info message')
hilog.warn(DOMAIN, TAG, 'Warning message')
hilog.error(DOMAIN, TAG, 'Error message')

// 简化方式
console.log('Simple log')
console.info('Info log')
console.warn('Warning log')
console.error('Error log')
```

### 热重载

DevEco Studio 支持 Hot Reload：
- 修改 UI 代码后自动刷新
- 按 `Ctrl+S` 保存触发
- 状态会保留（大部分情况）

不支持热重载的场景：
- 修改 Ability 入口
- 修改 module.json5 配置
- 修改服务/数据模型结构

### 性能分析

1. **Profiler**
   - View → Tool Windows → Profiler
   - CPU 分析
   - 内存分析
   - 帧率监控

2. **Frame Debugger**
   - 分析 UI 渲染性能
   - 检测丢帧原因

---

## 真机调试

### 1. 开启开发者模式

**HarmonyOS 手机：**
1. 设置 → 关于手机 → 连续点击"HarmonyOS 版本"7次
2. 返回设置 → 系统和更新 → 开发人员选项
3. 开启"USB 调试"

### 2. 连接设备

1. 使用 USB 数据线连接手机和电脑
2. 手机上选择"传输文件"模式
3. 弹出授权窗口时选择"允许"

### 3. 验证连接

```bash
hdc list targets
# 输出设备 ID 表示连接成功
```

在 DevEco Studio 中：
- 设备选择器中出现真机设备名称

### 4. 运行到真机

1. 选择真机设备
2. 点击 Run 按钮
3. 等待安装完成，应用自动启动

### 5. 无线调试

1. 确保手机和电脑在同一网络
2. 开发人员选项 → 开启"无线调试"
3. 记录显示的 IP 和端口
4. 连接：
   ```bash
   hdc tconn <ip>:<port>
   ```

---

## 构建发布

### 构建 HAP 包

```bash
cd apps/harmony
hvigorw assembleHap --mode module -p product=default
```

输出位置：`entry/build/default/outputs/default/entry-default-unsigned.hap`

### 构建 APP 包

```bash
hvigorw assembleApp --mode project -p product=default
```

输出位置：`build/outputs/default/personal-accounting-default-unsigned.app`

### 签名配置

1. **创建签名密钥**
   - Build → Generate Key and CSR
   - 保存 .p12 密钥和 .csr 文件

2. **申请证书**
   - 登录 [AppGallery Connect](https://developer.huawei.com/consumer/cn/service/josp/agc/index.html)
   - 我的项目 → 签名证书 → 上传 CSR
   - 下载证书文件 (.cer)

3. **配置签名**
   - 编辑 `build-profile.json5`
   ```json5
   {
     "app": {
       "signingConfigs": [
         {
           "name": "default",
           "type": "HarmonyOS",
           "material": {
             "certpath": "签名证书路径.cer",
             "storePassword": "密钥库密码",
             "keyAlias": "密钥别名",
             "keyPassword": "密钥密码",
             "profile": "profile文件路径.p7b",
             "signAlg": "SHA256withECDSA",
             "storeFile": "密钥库路径.p12"
           }
         }
       ]
     }
   }
   ```

4. **构建签名包**
   ```bash
   hvigorw assembleHap --mode module -p product=default -p signingConfig=default
   ```

### 版本管理

编辑 `entry/src/main/module.json5`：
```json5
{
  "module": {
    "name": "entry",
    "type": "entry",
    "description": "$string:module_desc",
    "mainElement": "EntryAbility",
    "deviceTypes": ["phone", "tablet"],
    "deliveryWithInstall": true,
    "installationFree": false,
    "pages": "$profile:main_pages"
  }
}
```

编辑 `AppScope/app.json5`：
```json5
{
  "app": {
    "bundleName": "com.example.personalaccounting",
    "vendor": "example",
    "versionCode": 1000000,  // 1.0.0 = 1000000
    "versionName": "1.0.0",
    "icon": "$media:app_icon",
    "label": "$string:app_name"
  }
}
```

---

## 常见问题

### 1. 项目同步失败

**问题：** ohpm install 失败

```bash
# 清除缓存重试
rm -rf .ohpm
rm -rf oh_modules
ohpm install
```

**问题：** SDK 版本不匹配

检查 `build-profile.json5` 中的 API 版本：
```json5
{
  "app": {
    "compileSdkVersion": 12,
    "compatibleSdkVersion": 12
  }
}
```

### 2. 模拟器启动失败

- 确保 CPU 虚拟化已开启 (BIOS 设置)
- 关闭其他虚拟化软件（VMware、VirtualBox）
- 尝试重启 DevEco Studio

### 3. 真机安装失败

**问题：** 签名验证失败
- 确保已配置正确的签名
- 检查证书是否过期
- 调试时可使用自动签名

**问题：** 设备未授权
- 重新插拔 USB
- 在手机上重新授权
- 检查 USB 调试是否开启

### 4. 网络请求失败

**问题：** 无法连接服务器

1. 检查网络权限：
   编辑 `entry/src/main/module.json5`：
   ```json5
   {
     "module": {
       "requestPermissions": [
         { "name": "ohos.permission.INTERNET" }
       ]
     }
   }
   ```

2. 检查服务器地址是否正确

3. 真机测试时确保网络连通

### 5. 热重载不生效

- 检查是否修改了配置文件
- 尝试 Build → Clean Project
- 重新 Run 应用

### 6. 状态丢失

`@ObservedV2` 状态在应用重启后会重置。持久化数据使用：
```typescript
import { preferences } from '@kit.ArkData'

// 保存
await preferences.putSync('key', value)

// 读取
const value = preferences.getSync('key', defaultValue)
```

---

## 调试技巧

### 1. 条件日志

```typescript
const DEBUG = true

function log(message: string) {
  if (DEBUG) {
    hilog.info(0x0000, 'DEBUG', message)
  }
}
```

### 2. 组件边界调试

```typescript
// 显示组件边界
.border({ width: 1, color: Color.Red })
.backgroundColor('#10FF0000')
```

### 3. 模拟慢网络

```typescript
// 添加延迟模拟
async function simulateSlowNetwork<T>(promise: Promise<T>): Promise<T> {
  await new Promise(resolve => setTimeout(resolve, 2000))
  return promise
}
```

### 4. 错误边界

```typescript
@Component
struct ErrorBoundary {
  @State hasError: boolean = false
  @BuilderParam content: () => void

  build() {
    if (this.hasError) {
      Text('Something went wrong')
        .fontSize(16)
        .fontColor(Color.Red)
    } else {
      this.content()
    }
  }
}
```

---

## 推荐工具

| 工具 | 用途 |
|------|------|
| [DevEco Studio](https://developer.huawei.com/consumer/cn/deveco-studio/) | 官方 IDE |
| [hdc](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/hdc-overview) | 命令行调试工具 |
| [ArkUI Inspector](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/arkts-inspector-guide) | UI 调试 |
| [Profiler](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/ide-profiler-overview) | 性能分析 |
| [Charles](https://www.charlesproxy.com/) | 网络抓包 |

---

## 体验流程

完整体验应用功能：

1. **启动应用** → 进入登录页
2. **配置服务器** → 设置后端地址并测试
3. **登录** → 输入手机号登录
4. **首页** → 底部导航：明细/统计/我的
5. **记账** → 点击 + 按钮，添加支出/收入
6. **账单明细** → 查看本月记录，左右滑动切换月份
7. **编辑记录** → 点击记录进入编辑，可修改或删除
8. **统计分析** → 查看分类统计和占比
9. **个人中心** → 管理账本、查看登录状态
10. **切换账本** → 创建新账本并切换

---

## 相关资源

- [HarmonyOS 官方文档](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/start-overview)
- [ArkTS 语言文档](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/introduction-to-arkts)
- [ArkUI 组件库](https://developer.huawei.com/consumer/cn/doc/harmonyos-references/reference-apis-arkui)
- [DevEco Studio 使用指南](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/ide-overview)
- [项目 API 文档](../../apps/backend/CODEBUDDY.md)

---

## HDC 常用命令

```bash
# 设备管理
hdc list targets              # 列出设备
hdc kill                      # 断开所有连接
hdc tconn <ip>:<port>         # 无线连接

# 文件操作
hdc file send <local> <remote>  # 推送文件
hdc file recv <remote> <local>  # 拉取文件

# 应用管理
hdc install <hap_path>        # 安装应用
hdc uninstall <bundle_name>   # 卸载应用

# Shell
hdc shell                     # 进入设备 Shell
hdc shell hilog               # 查看日志

# 调试
hdc hilog                     # 实时日志
hdc jpid                      # 查看进程
```
