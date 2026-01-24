#!/bin/sh
set -e

echo "========== Database Setup =========="
echo "DATABASE_URL: $DATABASE_URL"
echo "Syncing database schema..."

# 同步数据库结构（不重置数据）
# 如需重置数据库，添加 --force-reset 参数
npx prisma db push --schema=prisma/schema.prisma --accept-data-loss --skip-generate 2>&1 || echo "Warning: db push failed, continuing..."

echo "=================================="
echo "Starting application..."

exec node dist/main.js
