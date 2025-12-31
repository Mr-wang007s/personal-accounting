# @personal-accounting/web

Web 端应用 - 后续从原项目迁移。

## 迁移步骤

1. 复制原项目的 `src/` 目录到此处
2. 复制配置文件：`vite.config.ts`, `tailwind.config.js`, `postcss.config.js` 等
3. 更新导入路径：
   - `@/types` → `@personal-accounting/shared/types`
   - `@/lib/constants` → `@personal-accounting/shared/constants`
   - `@/lib/utils` → `@personal-accounting/shared/utils`（保留 cn 函数在本地）
4. 运行 `pnpm install`
5. 运行 `pnpm dev` 验证

## 开发命令

```bash
pnpm dev           # 启动开发服务器
pnpm build         # 构建生产版本
pnpm lint          # 代码检查
pnpm test:e2e      # 运行 E2E 测试
```
