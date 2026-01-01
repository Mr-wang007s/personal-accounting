# Build stage
FROM node:18-alpine AS builder

# Install pnpm
RUN npm install -g pnpm@9

WORKDIR /app

# Copy workspace configuration
COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./
COPY tsconfig.base.json ./

# Copy packages
COPY packages/ ./packages/

# Copy backend app
COPY apps/backend/ ./apps/backend/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build shared packages first
RUN pnpm --filter @personal-accounting/shared build
RUN pnpm --filter @personal-accounting/business-logic build

# Generate Prisma client
RUN cd apps/backend && npx prisma generate

# Build backend
RUN pnpm --filter @personal-accounting/backend build

# Production stage
FROM node:18-alpine AS runner

WORKDIR /app

# Install pnpm for production
RUN npm install -g pnpm@9

# Copy entire node_modules from builder (includes Prisma client)
COPY --from=builder /app/node_modules ./node_modules

# Copy built files
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/tsconfig.base.json ./

# Copy packages dist
COPY --from=builder /app/packages/ ./packages/

# Copy backend dist and necessary files
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/package.json ./apps/backend/
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=builder /app/apps/backend/node_modules ./apps/backend/node_modules

# Set environment
ENV NODE_ENV=production
ENV PORT=3000
ENV JWT_SECRET="cloudbase-pa-secret-key-2026"
ENV JWT_EXPIRES_IN="7d"
ENV ENABLE_DISCOVERY=true
# 禁用 SSL 证书验证（云托管网络代理使用自签名证书）
ENV NODE_TLS_REJECT_UNAUTHORIZED=0
# DATABASE_URL will be set via CloudRun environment variables

WORKDIR /app/apps/backend

# 创建数据目录
RUN mkdir -p /app/apps/backend/data

EXPOSE 3000

# 创建启动脚本：先同步数据库 schema，再启动应用
RUN echo '#!/bin/sh' > /app/apps/backend/start.sh && \
    echo 'set -e' >> /app/apps/backend/start.sh && \
    echo 'echo "========== Database Setup =========="' >> /app/apps/backend/start.sh && \
    echo 'echo "DATABASE_URL: $DATABASE_URL"' >> /app/apps/backend/start.sh && \
    echo 'echo "Syncing database schema..."' >> /app/apps/backend/start.sh && \
    echo 'npx prisma db push --accept-data-loss --skip-generate 2>&1 || echo "Warning: db push failed, continuing..."' >> /app/apps/backend/start.sh && \
    echo 'echo "=================================="' >> /app/apps/backend/start.sh && \
    echo 'echo "Starting application..."' >> /app/apps/backend/start.sh && \
    echo 'exec node dist/main.js' >> /app/apps/backend/start.sh && \
    chmod +x /app/apps/backend/start.sh

# Start the application with db sync
CMD ["/app/apps/backend/start.sh"]
