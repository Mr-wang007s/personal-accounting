# 认证系统技术文档

## 1. 系统架构

### 1.1 技术栈

| 组件 | 技术 | 版本 |
|------|------|------|
| 框架 | NestJS | 10.x |
| 认证 | Passport + JWT | passport-jwt |
| 邮件 | Nodemailer | 6.x |
| 数据库 | Prisma + MySQL | 6.x |

### 1.2 模块结构

```
src/auth/
├── auth.module.ts          # 模块定义
├── auth.controller.ts      # 路由控制器
├── auth.service.ts         # 业务逻辑
├── strategies/
│   └── jwt.strategy.ts     # JWT 验证策略
├── guards/
│   └── jwt-auth.guard.ts   # 路由守卫
├── decorators/
│   └── current-user.decorator.ts  # 用户装饰器
└── dto/
    ├── send-email-code.dto.ts
    ├── email-login.dto.ts
    └── login-response.dto.ts

src/email/
├── email.module.ts
└── email.service.ts        # 验证码发送与校验
```

---

## 2. 认证流程

### 2.1 时序图

```
客户端                      后端                        邮件服务
  │                          │                            │
  │  POST /auth/email/send   │                            │
  │  { email }               │                            │
  │ ─────────────────────────►                            │
  │                          │                            │
  │                          │  生成6位验证码              │
  │                          │  存储 Map<email, code>     │
  │                          │                            │
  │                          │  发送邮件                   │
  │                          │ ───────────────────────────►
  │                          │                            │
  │  { success, message }    │                            │
  │ ◄─────────────────────────                            │
  │                          │                            │
  │  POST /auth/email/login  │                            │
  │  { email, code }         │                            │
  │ ─────────────────────────►                            │
  │                          │                            │
  │                          │  验证码校验                 │
  │                          │  查找/创建用户              │
  │                          │  签发 JWT                  │
  │                          │                            │
  │  { accessToken, user }   │                            │
  │ ◄─────────────────────────                            │
  │                          │                            │
  │  GET /auth/me            │                            │
  │  Authorization: Bearer   │                            │
  │ ─────────────────────────►                            │
  │                          │                            │
  │                          │  JWT 解析验证               │
  │                          │  查询用户信息               │
  │                          │                            │
  │  { user }                │                            │
  │ ◄─────────────────────────                            │
```

### 2.2 状态流转

```
┌─────────────┐     发送验证码      ┌─────────────┐
│   未认证     │ ──────────────────► │  待验证     │
└─────────────┘                     └─────────────┘
                                          │
                                          │ 验证码正确
                                          ▼
┌─────────────┐     Token过期       ┌─────────────┐
│  需重新登录  │ ◄────────────────── │   已认证    │
└─────────────┘                     └─────────────┘
      │                                   │
      │         刷新Token                 │ Token即将过期
      └───────────────────────────────────┘
```

---

## 3. API 规范

### 3.1 发送验证码

```http
POST /api/auth/email/send
Content-Type: application/json
```

**请求体：**
```json
{
  "email": "user@example.com"
}
```

**成功响应 (200)：**
```json
{
  "success": true,
  "message": "验证码已发送，请查收邮箱"
}
```

**错误响应 (400)：**
```json
{
  "statusCode": 400,
  "message": "请等待 45 秒后再发送",
  "error": "Bad Request"
}
```

### 3.2 验证码登录

```http
POST /api/auth/email/login
Content-Type: application/json
```

**请求体：**
```json
{
  "email": "user@example.com",
  "code": "123456",
  "nickname": "昵称"       // 可选，新用户时生效
}
```

**成功响应 (200)：**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "cm5abc123",
    "nickname": "昵称",
    "avatar": null,
    "status": "active",
    "authType": "email",
    "identifier": "user@example.com",
    "boundAuths": ["email"]
  },
  "isNewUser": true
}
```

### 3.3 获取当前用户

```http
GET /api/auth/me
Authorization: Bearer <accessToken>
```

**成功响应 (200)：**
```json
{
  "id": "cm5abc123",
  "nickname": "昵称",
  "avatar": null,
  "status": "active",
  "boundAuths": ["email"]
}
```

### 3.4 刷新 Token

```http
POST /api/auth/refresh
Authorization: Bearer <accessToken>
```

**成功响应 (200)：**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...(新Token)",
  "user": { ... },
  "isNewUser": false
}
```

---

## 4. 核心实现

### 4.1 JWT 配置

```typescript
// auth.module.ts
JwtModule.registerAsync({
  useFactory: (configService: ConfigService) => ({
    secret: configService.get<string>('JWT_SECRET'),
    signOptions: {
      expiresIn: configService.get<string>('JWT_EXPIRES_IN', '7d'),
    },
  }),
})
```

### 4.2 Token Payload

```typescript
interface JwtPayload {
  sub: string        // 用户ID
  authType: AuthType // 'email' | 'phone' | 'wechat'
  identifier: string // 邮箱/手机号/openid
  iat: number        // 签发时间 (自动)
  exp: number        // 过期时间 (自动)
}
```

### 4.3 验证码服务

```typescript
// email.service.ts
class EmailService {
  // 内存存储（生产环境建议 Redis）
  private verificationCodes = new Map<string, {
    code: string
    expireAt: number
    sendAt: number
  }>()

  // 配置
  CODE_LENGTH = 6
  CODE_EXPIRE_MINUTES = 5
  SEND_INTERVAL_SECONDS = 60
  MAX_DAILY_SEND = 10
}
```

### 4.4 JWT 验证策略

```typescript
// jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService, authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    })
  }

  async validate(payload: JwtPayload) {
    return this.authService.validateToken(payload)
  }
}
```

---

## 5. 安全配置

### 5.1 环境变量

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `JWT_SECRET` | 是 | - | JWT 签名密钥，生产环境使用强随机字符串 |
| `JWT_EXPIRES_IN` | 否 | `7d` | Token 有效期 |
| `SMTP_HOST` | 是 | - | 邮件服务器地址 |
| `SMTP_PORT` | 否 | `465` | 邮件服务器端口 |
| `SMTP_USER` | 是 | - | 邮箱账号 |
| `SMTP_PASS` | 是 | - | 邮箱授权码 |

### 5.2 安全限制

| 限制项 | 值 | 说明 |
|--------|-----|------|
| 验证码长度 | 6位 | 纯数字 |
| 验证码有效期 | 5分钟 | 过期自动失效 |
| 发送间隔 | 60秒 | 防止频繁发送 |
| 每日上限 | 10次 | 防止滥用 |
| Token有效期 | 7天 | 支持刷新续期 |

---

## 6. 客户端集成

### 6.1 Token 存储

```typescript
// 小程序
const TOKEN_KEY = 'pa_token'
const TOKEN_EXPIRE_KEY = 'pa_token_expire'
const TOKEN_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000  // 7天

setToken(token: string) {
  this.token = token
  this.tokenExpireTime = Date.now() + TOKEN_LIFETIME_MS
  wx.setStorageSync(TOKEN_KEY, token)
  wx.setStorageSync(TOKEN_EXPIRE_KEY, this.tokenExpireTime)
}
```

### 6.2 自动刷新策略

```typescript
// 刷新阈值：距离过期 1 天时刷新
const REFRESH_THRESHOLD_MS = 1 * 24 * 60 * 60 * 1000

shouldRefreshToken(): boolean {
  const timeUntilExpire = this.tokenExpireTime - Date.now()
  return timeUntilExpire > 0 && timeUntilExpire < REFRESH_THRESHOLD_MS
}

// 请求前自动检查
async request(path, options) {
  if (this.shouldRefreshToken()) {
    await this.tryRefreshToken()
  }
  // ... 发起请求
}
```

### 6.3 401 重试机制

```typescript
// 收到 401 时尝试刷新后重试
if (res.statusCode === 401 && !options.skipAutoRefresh) {
  const success = await this.tryRefreshToken()
  if (success) {
    return this.request(path, { ...options, skipAutoRefresh: true })
  }
  throw new Error('登录已过期，请重新登录')
}
```

---

## 7. 与主流方案对比

### 7.1 方案对比表

| 特性 | 本项目方案 | OAuth 2.0 | Session-Cookie |
|------|-----------|-----------|----------------|
| **Token 类型** | 单 Token (Access) | Access + Refresh | Session ID |
| **存储位置** | 客户端 Storage | 客户端 Storage | 服务端 + Cookie |
| **有效期** | 7天 | Access 短 + Refresh 长 | 可配置 |
| **刷新机制** | 用原 Token 刷新 | 用 Refresh Token | 自动续期 |
| **无状态** | ✅ 是 | ✅ 是 | ❌ 否 |
| **跨域支持** | ✅ 好 | ✅ 好 | ⚠️ 需配置 |
| **实现复杂度** | 低 | 中 | 低 |

### 7.2 本方案特点

**优点：**
1. **简单易用** - 单 Token 设计，无需管理多个 Token
2. **适合移动端** - 无 Cookie 依赖，跨平台一致
3. **用户体验好** - 7天有效期 + 自动刷新 ≈ 永不过期

**缺点：**
1. **安全性较低** - Token 有效期长，泄露风险大
2. **无法即时撤销** - 除非引入 Token 黑名单
3. **刷新依赖原 Token** - 原 Token 过期后无法刷新

### 7.3 OAuth 2.0 标准方案

```
┌─────────────────────────────────────────────────────────┐
│  Access Token: 短期（15分钟-1小时）                       │
│  Refresh Token: 长期（7-30天）                           │
│                                                         │
│  刷新流程:                                               │
│  POST /oauth/token                                      │
│  grant_type=refresh_token                               │
│  refresh_token=<refresh_token>                          │
│                                                         │
│  返回: 新 Access Token + 新 Refresh Token               │
└─────────────────────────────────────────────────────────┘
```

**OAuth 2.0 优势：**
- Access Token 短期，泄露影响小
- Refresh Token 可单独撤销
- 符合行业标准

### 7.4 改进建议

如需提升安全性，可考虑：

```typescript
// 1. 引入双 Token
interface TokenPair {
  accessToken: string   // 有效期 15 分钟
  refreshToken: string  // 有效期 7 天，存储于数据库
}

// 2. Refresh Token 轮换
async refreshToken(refreshToken: string) {
  // 验证 refreshToken
  // 生成新的 accessToken + refreshToken
  // 旧 refreshToken 失效
}

// 3. Token 黑名单（Redis）
async logout(userId: string) {
  await redis.sadd('token_blacklist', currentTokenJti)
}
```

---

## 8. 测试

### 8.1 E2E 测试模式

```bash
# .env
E2E_TEST=true  # 验证码直接返回，不发送邮件
```

### 8.2 测试用例

```typescript
describe('Auth', () => {
  it('should send verification code', async () => {
    const res = await request(app)
      .post('/api/auth/email/send')
      .send({ email: 'test@example.com' })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('should login with code', async () => {
    const res = await request(app)
      .post('/api/auth/email/login')
      .send({ email: 'test@example.com', code: '123456' })
    expect(res.status).toBe(200)
    expect(res.body.accessToken).toBeDefined()
  })

  it('should refresh token', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.accessToken).not.toBe(token)
  })
})
```
