# Personal Accounting Monorepo

个人记账应用 - Monorepo 架构，支持多端开发。

## 项目结构

```
personal-accounting-monorepo/
├── packages/
│   ├── shared/           # 共享代码（类型、常量、工具函数）
│   ├── ui-components/    # UI 组件库
│   └── business-logic/   # 核心业务逻辑
├── apps/
│   ├── web/              # Web 应用（React + Vite）
│   └── backend/          # 后端服务（Nest.js）
├── docs/                 # 文档
│   └── ai-prompts/       # AI 提示词库
└── scripts/              # 自动化脚本
```

## 技术栈

- **Monorepo**: Turborepo + pnpm workspace
- **Web 端**: React 18 + TypeScript + Vite + Tailwind CSS
- **后端**: Nest.js + Prisma + PostgreSQL + Redis
- **测试**: Playwright (E2E) + Vitest (单元测试)

## 快速开始

### 环境要求

- Node.js 18+
- pnpm 9+

### 安装依赖

```bash
pnpm install
```

### 开发命令

```bash
# 启动 Web 开发服务器
pnpm dev:web

# 启动后端服务（需先完成第二阶段）
pnpm dev:backend

# 构建所有包
pnpm build

# 代码检查
pnpm lint

# 运行 E2E 测试
pnpm test:e2e
```

## 包说明

### @personal-accounting/shared

共享代码库，包含：
- `types/` - TypeScript 类型定义
- `constants/` - 分类常量
- `utils/` - 工具函数（日期、格式化等）

### @personal-accounting/business-logic

核心业务逻辑（纯函数实现），包含：
- `records/` - 记账记录计算器
- `statistics/` - 统计服务

### @personal-accounting/ui-components

跨端 UI 组件库（后续开发）。

### @personal-accounting/web

Web 端应用，从原项目迁移。

### @personal-accounting/backend

后端 API 服务（第二阶段开发）。

## 开发计划

参考 `docs/MIGRATION_PLAN.md` 了解完整的开发路线图。

## AI 协作

本项目使用 AI 辅助开发，提示词库位于 `docs/ai-prompts/`。

## License

Private
