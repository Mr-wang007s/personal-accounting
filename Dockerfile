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
# DATABASE_URL will be set via CloudRun environment variables

WORKDIR /app/apps/backend

EXPOSE 3000

# Start the application
CMD ["node", "dist/main.js"]
