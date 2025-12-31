/**
 * 开发环境 Mock 用户数据
 * 当 SKIP_AUTH=true 时，自动注入此用户信息
 */
export const MOCK_USER = {
  id: 'dev-user-001',
  openid: 'dev-openid-001',
  unionid: null,
  nickname: 'Dev User',
  avatar: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
} as const

export type MockUser = typeof MOCK_USER
