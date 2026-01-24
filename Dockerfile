# ========================================
# Build Stage
# ========================================
FROM node:18-alpine AS builder

# Install dependencies for Prisma
RUN apk add --no-cache openssl openssl-dev libc6-compat

# Install pnpm
RUN npm install -g pnpm@9

WORKDIR /app

# Copy workspace configuration
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./

# Copy packages and backend
COPY packages/ ./packages/
COPY apps/backend/ ./apps/backend/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build shared packages
RUN pnpm --filter @personal-accounting/shared build && \
    pnpm --filter @personal-accounting/business-logic build

# Generate Prisma client (use MySQL schema for production)
RUN cd apps/backend && \
    cp prisma/schema.mysql.prisma prisma/schema.prisma && \
    npx prisma generate

# Build backend
RUN pnpm --filter @personal-accounting/backend build

# ========================================
# Production Stage
# ========================================
FROM node:18-alpine AS runner

# Install runtime dependencies for Prisma
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Copy node_modules (includes Prisma client)
COPY --from=builder /app/node_modules ./node_modules

# Copy workspace config
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./

# Copy packages
COPY --from=builder /app/packages/ ./packages/

# Copy backend
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/package.json ./apps/backend/
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=builder /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=builder /app/apps/backend/scripts ./apps/backend/scripts

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    JWT_SECRET="cloudbase-pa-secret-key-2026" \
    JWT_EXPIRES_IN="7d" \
    ENABLE_DISCOVERY=true \
    NODE_TLS_REJECT_UNAUTHORIZED=0

WORKDIR /app/apps/backend

# Ensure start script is executable
RUN chmod +x scripts/start.sh

EXPOSE 3000

CMD ["./scripts/start.sh"]
