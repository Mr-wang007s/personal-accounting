import { defineConfig } from 'vitest/config'
import swc from 'unplugin-swc'

export default defineConfig({
  test: {
    include: ['test/**/*.e2e-spec.ts'],
    globals: true,
    root: './',
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    // 串行执行测试，避免数据库冲突
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    sequence: {
      shuffle: false,
    },
    env: {
      NODE_ENV: 'test',
      SKIP_AUTH: 'true',
      JWT_SECRET: 'test-secret-key',
      JWT_EXPIRES_IN: '1h',
      DATABASE_URL: 'file:./dev.db',
      PORT: '3000',
    },
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
})
