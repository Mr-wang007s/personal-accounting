# @personal-accounting/backend

后端服务 - 第二阶段开发。

## 技术栈

- Nest.js
- Prisma ORM
- PostgreSQL
- Redis
- JWT 认证

## 功能模块

- `/auth` - 微信登录、JWT 认证
- `/users` - 用户管理
- `/records` - 记账记录 CRUD
- `/sync` - 数据同步服务

## 开发命令

```bash
pnpm dev           # 启动开发服务器
pnpm build         # 构建生产版本
pnpm db:migrate    # 运行数据库迁移
pnpm db:generate   # 生成 Prisma Client
```

## 开发计划

参考 `/docs/ai-prompts/phase-2-backend-api.md`
