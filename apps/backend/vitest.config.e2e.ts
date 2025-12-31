import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.e2e-spec.ts'],
    globals: true,
    root: './',
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    env: {
      NODE_ENV: 'test',
      SKIP_AUTH: 'true',
      JWT_SECRET: 'test-secret-key',
      JWT_EXPIRES_IN: '1h',
      DATABASE_URL: 'file:./dev.db',
      PORT: '3000',
    },
  },
})
