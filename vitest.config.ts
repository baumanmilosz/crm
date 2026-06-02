import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    env: {
      DATABASE_URL: 'postgresql://postgres:password@localhost:5432/crm_test',
      JWT_ACCESS_SECRET: 'test-access-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      PORT: '3001',
    },
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
  },
})
