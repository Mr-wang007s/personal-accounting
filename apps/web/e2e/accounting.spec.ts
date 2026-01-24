import { test, expect, Page } from '@playwright/test'

/**
 * 个人记账应用 BDD E2E 测试
 * 技术栈: React + Vite + TypeScript + Tailwind + Radix UI
 * 
 * BDD 测试策略：
 * - Given: 设置测试前置条件
 * - When: 执行用户操作
 * - Then: 验证预期结果
 * 
 * 后端依赖：需要启动后端服务 (localhost:3000)
 */

const TEST_PHONE = '13800138000'

// ==================== 辅助函数 ====================

/**
 * 完成登录流程
 * Given 用户在登录页
 * When 用户输入手机号并点击登录
 * Then 用户进入首页
 */
async function login(page: Page, phone = TEST_PHONE) {
  await page.waitForSelector('text=手机号登录', { timeout: 10000 })
  await page.locator('input[placeholder*="手机号"]').fill(phone)
  await page.getByRole('button', { name: '开始记账' }).click()
  await page.waitForSelector('text=我的账本', { timeout: 15000 })
}

/**
 * 初始化测试环境（清除登录状态并重新登录）
 */
async function initializeTestEnv(page: Page) {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.waitForLoadState('networkidle')
  await login(page)
  await page.waitForTimeout(1000)
}

/**
 * 添加测试记录
 */
async function addTestRecord(
  page: Page, 
  type: 'income' | 'expense', 
  amount: string, 
  category: string,
  note?: string
) {
  await page.getByRole('button', { name: type === 'income' ? '记收入' : '记支出' }).click()
  await page.waitForLoadState('networkidle')
  await page.locator('input[inputmode="decimal"]').fill(amount)
  await page.locator('.grid.grid-cols-5 button').filter({ hasText: category }).click()
  if (note) {
    await page.locator('input[placeholder="添加备注..."]').fill(note)
  }
  await page.getByRole('button', { name: '保存记录' }).click()
  await page.waitForSelector('text=我的账本', { timeout: 10000 })
}

/**
 * 导航到指定页面
 */
async function navigateTo(page: Page, tabName: '首页' | '记账' | '账单' | '我的') {
  await page.locator('nav button').filter({ hasText: tabName }).click()
  await page.waitForLoadState('networkidle')
}

// ==================== Feature: 用户认证 ====================

test.describe('Feature: 用户认证', () => {
  
  test.describe('Scenario: 显示登录页面', () => {
    test('Given 用户首次访问应用, Then 应显示登录页面', async ({ page }) => {
      // Given: 用户首次访问应用（清除登录状态）
      await page.goto('/')
      await page.evaluate(() => localStorage.clear())
      await page.reload()
      await page.waitForLoadState('networkidle')
      
      // Then: 应显示登录页面所有元素
      await expect(page.getByRole('heading', { name: '手机号登录' })).toBeVisible()
      await expect(page.locator('input[placeholder*="手机号"]')).toBeVisible()
      await expect(page.getByRole('button', { name: '开始记账' })).toBeVisible()
    })
  })

  test.describe('Scenario: 手机号登录成功', () => {
    test('Given 用户在登录页, When 输入有效手机号并点击登录, Then 成功进入首页', async ({ page }) => {
      // Given: 用户在登录页
      await page.goto('/')
      await page.evaluate(() => localStorage.clear())
      await page.reload()
      await page.waitForLoadState('networkidle')
      
      // When: 输入手机号并点击登录
      await page.locator('input[placeholder*="手机号"]').fill(TEST_PHONE)
      await page.getByRole('button', { name: '开始记账' }).click()
      
      // Then: 成功进入首页
      await expect(page.getByRole('heading', { name: '我的账本' })).toBeVisible({ timeout: 15000 })
    })
  })

  test.describe('Scenario: 登录状态持久化', () => {
    test('Given 用户已登录, When 刷新页面, Then 应保持登录状态', async ({ page }) => {
      // Given: 用户已登录
      await initializeTestEnv(page)
      
      // When: 刷新页面
      await page.reload()
      await page.waitForLoadState('networkidle')
      
      // Then: 应保持登录状态，直接进入首页
      await expect(page.getByRole('heading', { name: '我的账本' })).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Scenario: 退出登录', () => {
    test('Given 用户已登录, When 点击退出登录, Then 返回登录页', async ({ page }) => {
      // Given: 用户已登录并进入我的页面
      await initializeTestEnv(page)
      await navigateTo(page, '我的')
      
      // When: 设置对话框自动确认，点击退出登录
      page.on('dialog', dialog => dialog.accept())
      await page.getByText('退出登录').click()
      
      // Then: 返回登录页
      await expect(page.getByRole('heading', { name: '手机号登录' })).toBeVisible({ timeout: 5000 })
    })
  })
})

// ==================== Feature: 首页功能 ====================

test.describe('Feature: 首页功能', () => {
  
  test.beforeEach(async ({ page }) => {
    await initializeTestEnv(page)
  })
  
  test.describe('Scenario: 首页布局展示', () => {
    test('Given 用户已登录, Then 首页应显示所有核心元素', async ({ page }) => {
      // Then: 验证首页所有核心元素
      await expect(page.getByRole('heading', { name: '我的账本' })).toBeVisible()
      await expect(page.getByText('当前余额')).toBeVisible()
      await expect(page.getByRole('button', { name: '记收入' })).toBeVisible()
      await expect(page.getByRole('button', { name: '记支出' })).toBeVisible()
      
      // 验证底部导航
      await expect(page.locator('nav button').filter({ hasText: '首页' })).toBeVisible()
      await expect(page.locator('nav button').filter({ hasText: '记账' })).toBeVisible()
      await expect(page.locator('nav button').filter({ hasText: '账单' })).toBeVisible()
      await expect(page.locator('nav button').filter({ hasText: '我的' })).toBeVisible()
    })
  })

  test.describe('Scenario: 余额卡片显示', () => {
    test('Given 用户有收支记录, Then 余额卡片应正确显示收入、支出、余额', async ({ page }) => {
      // Given: 添加测试数据
      await addTestRecord(page, 'income', '1000', '工资')
      await addTestRecord(page, 'expense', '200', '餐饮')
      
      // Then: 余额卡片应显示
      const balanceCard = page.locator('.bg-gradient-to-br').first()
      await expect(balanceCard).toBeVisible()
      await expect(page.getByText('当前余额')).toBeVisible()
      await expect(page.getByText('收入').first()).toBeVisible()
      await expect(page.getByText('支出').first()).toBeVisible()
    })
  })

  test.describe('Scenario: 最近记录展示', () => {
    test('Given 用户有记录, Then 首页应显示最近记录', async ({ page }) => {
      // Given: 添加测试记录
      await addTestRecord(page, 'expense', '50', '餐饮', '午餐')
      
      // Then: 首页应显示该记录
      await expect(page.getByText('最近记录')).toBeVisible()
      await expect(page.locator('main').getByText('餐饮').first()).toBeVisible()
    })
  })
})

// ==================== Feature: 记账功能 ====================

test.describe('Feature: 记支出', () => {
  
  test.beforeEach(async ({ page }) => {
    await initializeTestEnv(page)
  })

  test.describe('Scenario: 记录一笔支出', () => {
    test('Given 用户在首页, When 完整填写支出表单并保存, Then 支出记录成功创建', async ({ page }) => {
      // When: 点击记支出
      await page.getByRole('button', { name: '记支出' }).click()
      await page.waitForLoadState('networkidle')
      
      // Then: 进入记支出页面
      await expect(page.getByRole('heading', { name: '记支出' })).toBeVisible()
      
      // When: 填写表单
      await page.locator('input[inputmode="decimal"]').fill('88.50')
      await page.locator('.grid.grid-cols-5 button').filter({ hasText: '餐饮' }).click()
      await page.locator('input[placeholder="添加备注..."]').fill('午餐')
      
      // Then: 保存按钮可用
      const saveBtn = page.getByRole('button', { name: '保存记录' })
      await expect(saveBtn).toBeEnabled()
      
      // When: 保存
      await saveBtn.click()
      await page.waitForLoadState('networkidle')
      
      // Then: 返回首页并显示记录
      await expect(page.getByRole('heading', { name: '我的账本' })).toBeVisible()
      await expect(page.locator('main').getByText('餐饮').first()).toBeVisible()
    })
  })

  test.describe('Scenario: 支出分类选择', () => {
    test('Given 用户在记支出页, When 选择不同分类, Then 分类应正确切换', async ({ page }) => {
      await page.getByRole('button', { name: '记支出' }).click()
      await page.waitForLoadState('networkidle')
      
      // When: 选择餐饮分类
      await page.locator('.grid.grid-cols-5 button').filter({ hasText: '餐饮' }).click()
      
      // Then: 餐饮分类应被选中（有选中样式）
      await expect(page.locator('.grid.grid-cols-5 button').filter({ hasText: '餐饮' })).toHaveClass(/ring-2/)
      
      // When: 切换到交通分类
      await page.locator('.grid.grid-cols-5 button').filter({ hasText: '交通' }).click()
      
      // Then: 交通分类应被选中
      await expect(page.locator('.grid.grid-cols-5 button').filter({ hasText: '交通' })).toHaveClass(/ring-2/)
    })
  })
})

test.describe('Feature: 记收入', () => {
  
  test.beforeEach(async ({ page }) => {
    await initializeTestEnv(page)
  })

  test.describe('Scenario: 记录一笔收入', () => {
    test('Given 用户在首页, When 完整填写收入表单并保存, Then 收入记录成功创建', async ({ page }) => {
      // When: 点击记收入
      await page.getByRole('button', { name: '记收入' }).click()
      await page.waitForLoadState('networkidle')
      
      // Then: 进入记收入页面
      await expect(page.getByRole('heading', { name: '记收入' })).toBeVisible()
      
      // When: 填写表单
      await page.locator('input[inputmode="decimal"]').fill('5000')
      await page.locator('.grid.grid-cols-5 button').filter({ hasText: '工资' }).click()
      await page.locator('input[placeholder="添加备注..."]').fill('12月工资')
      
      // When: 保存
      await page.getByRole('button', { name: '保存记录' }).click()
      await page.waitForLoadState('networkidle')
      
      // Then: 返回首页并显示记录
      await expect(page.locator('main').getByText('工资').first()).toBeVisible()
    })
  })
})

test.describe('Feature: 记账表单验证', () => {
  
  test.beforeEach(async ({ page }) => {
    await initializeTestEnv(page)
  })

  test.describe('Scenario: 金额和分类必填验证', () => {
    test('Given 用户在记账页, When 未填写必填字段, Then 保存按钮应禁用', async ({ page }) => {
      await page.getByRole('button', { name: '记支出' }).click()
      await page.waitForLoadState('networkidle')
      
      const saveBtn = page.getByRole('button', { name: '保存记录' })
      
      // Then: 初始状态禁用
      await expect(saveBtn).toBeDisabled()
      
      // When: 只填金额
      await page.locator('input[inputmode="decimal"]').fill('100')
      
      // Then: 仍然禁用
      await expect(saveBtn).toBeDisabled()
      
      // When: 选择分类
      await page.locator('.grid.grid-cols-5 button').filter({ hasText: '餐饮' }).click()
      
      // Then: 启用
      await expect(saveBtn).toBeEnabled()
      
      // When: 清空金额
      await page.locator('input[inputmode="decimal"]').fill('')
      
      // Then: 再次禁用
      await expect(saveBtn).toBeDisabled()
    })
  })

  test.describe('Scenario: 日期选择功能', () => {
    test('Given 用户在记账页, When 修改日期, Then 日期应正确更新', async ({ page }) => {
      await page.getByRole('button', { name: '记支出' }).click()
      await page.waitForLoadState('networkidle')
      
      const dateInput = page.locator('input[type="date"]')
      
      // Then: 日期输入框存在
      await expect(dateInput).toBeVisible()
      
      // Then: 默认是今天
      const today = new Date().toISOString().split('T')[0]
      await expect(dateInput).toHaveValue(today)
      
      // When: 修改为昨天
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
      await dateInput.fill(yesterday)
      
      // Then: 日期更新
      await expect(dateInput).toHaveValue(yesterday)
    })
  })
})

// ==================== Feature: 账单功能 ====================

test.describe('Feature: 账单列表', () => {
  
  test.beforeEach(async ({ page }) => {
    await initializeTestEnv(page)
    await addTestRecord(page, 'expense', '50', '餐饮')
    await addTestRecord(page, 'income', '1000', '工资')
  })

  test.describe('Scenario: 账单列表展示', () => {
    test('Given 用户有收支记录, When 进入账单页, Then 应显示账单列表', async ({ page }) => {
      // When: 导航到账单页
      await navigateTo(page, '账单')
      
      // Then: 验证页面标题
      await expect(page.getByRole('heading', { name: '账单' })).toBeVisible()
      
      // Then: 验证账单明细 Tab 激活
      await expect(page.getByRole('tab', { name: '账单明细' })).toHaveAttribute('data-state', 'active')
      
      // Then: 验证月份选择器
      const currentMonth = new Date().toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
      })
      await expect(page.getByText(currentMonth).first()).toBeVisible()
      
      // Then: 验证月度汇总
      await expect(page.getByText('收入').first()).toBeVisible()
      await expect(page.getByText('支出').first()).toBeVisible()
      await expect(page.getByText('结余')).toBeVisible()
    })
  })

  test.describe('Scenario: 月份切换', () => {
    test('Given 用户在账单页, When 切换月份, Then 应显示对应月份数据', async ({ page }) => {
      await navigateTo(page, '账单')
      
      const currentMonth = new Date().toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
      })
      
      // Then: 验证当前月份
      await expect(page.getByText(currentMonth).first()).toBeVisible()
      
      // When: 点击上一月
      await page.locator('button').filter({ has: page.locator('.lucide-chevron-left') }).click()
      await page.waitForTimeout(300)
      
      // When: 点击下一月回到当前月
      await page.locator('button').filter({ has: page.locator('.lucide-chevron-right') }).click()
      
      // Then: 显示当前月
      await expect(page.getByText(currentMonth).first()).toBeVisible()
    })
  })
})

test.describe('Feature: 统计分析', () => {
  
  test.beforeEach(async ({ page }) => {
    await initializeTestEnv(page)
    await addTestRecord(page, 'expense', '100', '餐饮')
    await addTestRecord(page, 'expense', '200', '交通')
    await addTestRecord(page, 'income', '5000', '工资')
  })

  test.describe('Scenario: 统计数据展示', () => {
    test('Given 用户有收支记录, When 查看统计分析, Then 应正确显示统计数据', async ({ page }) => {
      // When: 进入账单页并切换到统计分析
      await navigateTo(page, '账单')
      await page.getByRole('tab', { name: '统计分析' }).click()
      
      // Then: 统计分析 Tab 激活
      await expect(page.getByRole('tab', { name: '统计分析' })).toHaveAttribute('data-state', 'active')
      
      // Then: 显示汇总卡片
      await expect(page.getByText('总收入')).toBeVisible()
      await expect(page.getByText('总支出')).toBeVisible()
      
      // Then: 显示内部 Tab
      await expect(page.getByRole('tab', { name: '收支趋势' })).toBeVisible()
      await expect(page.getByRole('tab', { name: '分类占比' })).toBeVisible()
    })
  })

  test.describe('Scenario: 分类占比切换', () => {
    test('Given 用户在统计分析页, When 切换到分类占比, Then 应显示分类占比数据', async ({ page }) => {
      await navigateTo(page, '账单')
      await page.getByRole('tab', { name: '统计分析' }).click()
      
      // When: 切换到分类占比
      await page.getByRole('tab', { name: '分类占比' }).click()
      
      // Then: 分类占比 Tab 激活
      await expect(page.getByRole('tab', { name: '分类占比' })).toHaveAttribute('data-state', 'active')
    })
  })
})

// ==================== Feature: 编辑记录 ====================

test.describe('Feature: 编辑记录', () => {
  
  test.describe('Scenario: 编辑已有记录', () => {
    test('Given 用户有一条记录, When 编辑记录内容, Then 记录应成功更新', async ({ page }) => {
      // Given: 创建测试记录
      await initializeTestEnv(page)
      await addTestRecord(page, 'expense', '100', '餐饮', '原始备注')
      
      // When: 进入账单页
      await navigateTo(page, '账单')
      
      // When: 点击记录进入编辑页面
      await page.locator('.group').filter({ hasText: '餐饮' }).first().click()
      
      // Then: 进入编辑页面
      await expect(page.getByRole('heading', { name: '编辑账单' })).toBeVisible()
      
      // When: 修改金额和备注
      await page.locator('input[inputmode="decimal"]').fill('200')
      await page.locator('input[placeholder="添加备注..."]').fill('修改后的备注')
      
      // When: 保存修改
      await page.getByRole('button', { name: '保存修改' }).click()
      await page.waitForLoadState('networkidle')
      
      // Then: 返回账单页
      await expect(page.getByRole('heading', { name: '账单' })).toBeVisible()
    })
  })
})

// ==================== Feature: 删除记录 ====================

test.describe('Feature: 删除记录', () => {
  
  test.describe('Scenario: 删除单条记录', () => {
    test('Given 用户有多条记录, When 删除一条记录, Then 该记录应从列表中移除', async ({ page }) => {
      // Given: 创建测试记录
      await initializeTestEnv(page)
      await addTestRecord(page, 'expense', '100', '餐饮', '待删除')
      await addTestRecord(page, 'expense', '50', '交通', '保留')
      
      // When: 进入账单页
      await navigateTo(page, '账单')
      
      // Then: 验证有2条记录
      await expect(page.locator('.group').filter({ hasText: '餐饮' }).first()).toBeVisible()
      await expect(page.locator('.group').filter({ hasText: '交通' }).first()).toBeVisible()
      
      // When: 悬停并点击删除按钮
      const mealRecord = page.locator('.group').filter({ hasText: '餐饮' }).first()
      await mealRecord.hover()
      await mealRecord.locator('button').filter({ has: page.locator('.lucide-trash-2') }).click()
      
      // Then: 显示确认对话框
      await expect(page.getByText('确认删除')).toBeVisible()
      
      // When: 确认删除
      await page.getByRole('button', { name: '删除' }).click()
      await page.waitForTimeout(500)
      
      // Then: 餐饮记录已删除，交通记录仍在
      await expect(page.locator('.group').filter({ hasText: '交通' }).first()).toBeVisible()
    })
  })
})

// ==================== Feature: 我的页面 ====================

test.describe('Feature: 我的页面', () => {
  
  test.beforeEach(async ({ page }) => {
    await initializeTestEnv(page)
  })

  test.describe('Scenario: 个人中心展示', () => {
    test('Given 用户已登录, When 进入我的页面, Then 应正确显示个人信息', async ({ page }) => {
      // When: 导航到我的页面
      await navigateTo(page, '我的')
      
      // Then: 验证页面标题
      await expect(page.getByRole('heading', { name: '我的' })).toBeVisible()
      
      // Then: 等待账本加载完成
      await expect(page.getByText(/\d+ 个账本/)).toBeVisible({ timeout: 10000 })
      
      // Then: 验证退出登录按钮
      await expect(page.getByText('退出登录')).toBeVisible()
    })
  })

  test.describe('Scenario: 展开账本列表', () => {
    test('Given 用户在我的页面, When 点击账本区域, Then 应展开账本列表', async ({ page }) => {
      await navigateTo(page, '我的')
      
      // Then: 等待账本加载
      await expect(page.getByText(/\d+ 个账本/)).toBeVisible({ timeout: 10000 })
      
      // When: 点击展开账本列表
      await page.locator('.cursor-pointer').filter({ hasText: /个账本/ }).first().click()
      
      // Then: 显示新建账本按钮
      await expect(page.getByText('新建账本')).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('Scenario: 创建新账本', () => {
    test('Given 用户在我的页面, When 创建新账本, Then 账本数量应增加', async ({ page }) => {
      await navigateTo(page, '我的')
      
      // Then: 等待账本加载
      await expect(page.getByText(/\d+ 个账本/)).toBeVisible({ timeout: 10000 })
      
      // Given: 获取当前账本数量
      const ledgerCountText = await page.getByText(/\d+ 个账本/).textContent()
      const currentCount = parseInt(ledgerCountText?.match(/\d+/)?.[0] || '0')
      
      // When: 展开账本列表
      await page.locator('.cursor-pointer').filter({ hasText: /个账本/ }).first().click()
      await expect(page.getByText('新建账本')).toBeVisible({ timeout: 5000 })
      
      // When: 点击新建账本
      await page.getByText('新建账本').click()
      
      // When: 输入账本名称
      const uniqueName = `测试账本_${Date.now()}`
      await page.locator('input[placeholder="输入账本名称"]').fill(uniqueName)
      
      // When: 创建
      await page.getByRole('button', { name: '创建' }).click()
      
      // Then: 账本数量增加
      await expect(page.getByText(`${currentCount + 1} 个账本`)).toBeVisible({ timeout: 5000 })
    })
  })
})

// ==================== Feature: 导航功能 ====================

test.describe('Feature: 导航功能', () => {
  
  test.beforeEach(async ({ page }) => {
    await initializeTestEnv(page)
  })
  
  test.describe('Scenario: 底部导航切换', () => {
    test('Given 用户在首页, When 点击底部导航, Then 应正确切换页面', async ({ page }) => {
      // When: 首页 -> 账单
      await navigateTo(page, '账单')
      await expect(page.getByRole('heading', { name: '账单' })).toBeVisible()
      
      // When: 账单 -> 我的
      await navigateTo(page, '我的')
      await expect(page.getByRole('heading', { name: '我的' })).toBeVisible()
      
      // When: 我的 -> 首页
      await navigateTo(page, '首页')
      await expect(page.getByRole('heading', { name: '我的账本' })).toBeVisible()
    })
  })

  test.describe('Scenario: 记账导航', () => {
    test('Given 用户在首页, When 点击底部记账按钮, Then 应打开记支出页面', async ({ page }) => {
      // When: 点击记账
      await navigateTo(page, '记账')
      
      // Then: 打开默认的支出记账页面
      await expect(page.getByRole('heading', { name: '记支出' })).toBeVisible()
    })
  })

  test.describe('Scenario: 返回导航', () => {
    test('Given 用户在记账页, When 点击返回, Then 应返回首页', async ({ page }) => {
      // Given: 进入记支出页面
      await page.getByRole('button', { name: '记支出' }).click()
      await expect(page.getByRole('heading', { name: '记支出' })).toBeVisible()
      
      // When: 点击返回
      await page.locator('header button').first().click()
      await page.waitForLoadState('networkidle')
      
      // Then: 返回首页
      await expect(page.getByRole('heading', { name: '我的账本' })).toBeVisible()
    })
  })
})

// ==================== Feature: 完整用户流程 ====================

test.describe('Feature: 完整用户流程（端到端场景）', () => {
  
  test('Scenario: 新用户完整使用流程', async ({ page }) => {
    /**
     * Given 新用户首次访问应用
     * When 用户完成登录、记支出、记收入、查看账单、查看统计
     * Then 所有功能正常运行
     */
    
    // Given: 清除登录状态
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.waitForLoadState('networkidle')

    // ========== Step 1: 登录 ==========
    await test.step('Given 新用户访问登录页, When 输入手机号登录, Then 成功进入首页', async () => {
      await expect(page.getByRole('heading', { name: '手机号登录' })).toBeVisible()
      await page.locator('input[placeholder*="手机号"]').fill(TEST_PHONE)
      await page.getByRole('button', { name: '开始记账' }).click()
      await expect(page.getByRole('heading', { name: '我的账本' })).toBeVisible({ timeout: 15000 })
    })

    // ========== Step 2: 记一笔支出（餐饮） ==========
    await test.step('Given 用户在首页, When 记录一笔餐饮支出, Then 支出记录创建成功', async () => {
      await page.getByRole('button', { name: '记支出' }).click()
      await page.waitForLoadState('networkidle')
      
      await expect(page.getByRole('heading', { name: '记支出' })).toBeVisible()
      
      await page.locator('input[inputmode="decimal"]').fill('128.50')
      await page.locator('.grid.grid-cols-5 button').filter({ hasText: '餐饮' }).click()
      await page.locator('input[placeholder="添加备注..."]').fill('和朋友聚餐')
      
      await page.getByRole('button', { name: '保存记录' }).click()
      await page.waitForLoadState('networkidle')
      
      await expect(page.getByRole('heading', { name: '我的账本' })).toBeVisible()
      await expect(page.locator('main').getByText('餐饮').first()).toBeVisible()
    })

    // ========== Step 3: 记一笔支出（交通） ==========
    await test.step('Given 用户在首页, When 记录一笔交通支出, Then 支出记录创建成功', async () => {
      await page.getByRole('button', { name: '记支出' }).click()
      await page.waitForLoadState('networkidle')
      
      await page.locator('input[inputmode="decimal"]').fill('35')
      await page.locator('.grid.grid-cols-5 button').filter({ hasText: '交通' }).click()
      await page.locator('input[placeholder="添加备注..."]').fill('打车回家')
      
      await page.getByRole('button', { name: '保存记录' }).click()
      await page.waitForLoadState('networkidle')
      
      await expect(page.locator('main').getByText('交通').first()).toBeVisible()
    })

    // ========== Step 4: 记一笔收入 ==========
    await test.step('Given 用户在首页, When 记录一笔工资收入, Then 收入记录创建成功', async () => {
      await page.getByRole('button', { name: '记收入' }).click()
      await page.waitForLoadState('networkidle')
      
      await expect(page.getByRole('heading', { name: '记收入' })).toBeVisible()
      
      await page.locator('input[inputmode="decimal"]').fill('8000')
      await page.locator('.grid.grid-cols-5 button').filter({ hasText: '工资' }).click()
      await page.locator('input[placeholder="添加备注..."]').fill('12月份工资')
      
      await page.getByRole('button', { name: '保存记录' }).click()
      await page.waitForLoadState('networkidle')
      
      await expect(page.locator('main').getByText('工资').first()).toBeVisible()
    })

    // ========== Step 5: 查看账单列表 ==========
    await test.step('Given 用户有多条记录, When 进入账单页, Then 显示所有记录和汇总', async () => {
      await page.locator('nav button').filter({ hasText: '账单' }).click()
      await page.waitForLoadState('networkidle')
      
      await expect(page.getByRole('heading', { name: '账单' })).toBeVisible()
      
      // 验证月度汇总
      await expect(page.getByText('收入').first()).toBeVisible()
      await expect(page.getByText('支出').first()).toBeVisible()
      await expect(page.getByText('结余')).toBeVisible()
      
      // 验证记录列表
      await expect(page.locator('.group').filter({ hasText: '餐饮' }).first()).toBeVisible()
      await expect(page.locator('.group').filter({ hasText: '交通' }).first()).toBeVisible()
      await expect(page.locator('.group').filter({ hasText: '工资' }).first()).toBeVisible()
    })

    // ========== Step 6: 查看统计分析 ==========
    await test.step('Given 用户在账单页, When 切换到统计分析, Then 显示统计数据', async () => {
      await page.getByRole('tab', { name: '统计分析' }).click()
      
      await expect(page.getByRole('tab', { name: '统计分析' })).toHaveAttribute('data-state', 'active')
      await expect(page.getByText('总收入')).toBeVisible()
      await expect(page.getByText('总支出')).toBeVisible()
      
      // 切换到分类占比
      await page.getByRole('tab', { name: '分类占比' }).click()
      await expect(page.getByRole('tab', { name: '分类占比' })).toHaveAttribute('data-state', 'active')
    })

    // ========== Step 7: 查看我的页面 ==========
    await test.step('Given 用户完成记账, When 进入我的页面, Then 显示账本和用户信息', async () => {
      await page.locator('nav button').filter({ hasText: '我的' }).click()
      await page.waitForLoadState('networkidle')
      
      await expect(page.getByRole('heading', { name: '我的' })).toBeVisible()
      await expect(page.getByText(/\d+ 个账本/)).toBeVisible({ timeout: 10000 })
    })

    // ========== Step 8: 返回首页验证余额 ==========
    await test.step('Given 用户完成全部操作, When 返回首页, Then 余额正确显示', async () => {
      await page.locator('nav button').filter({ hasText: '首页' }).click()
      await page.waitForLoadState('networkidle')
      
      await expect(page.getByRole('heading', { name: '我的账本' })).toBeVisible()
      
      const balanceCard = page.locator('.bg-gradient-to-br').first()
      await expect(balanceCard).toBeVisible()
    })
  })

  test('Scenario: 编辑和删除记录流程', async ({ page }) => {
    /**
     * Given 用户已有记录
     * When 用户编辑并删除记录
     * Then 记录正确更新和删除
     */
    
    await initializeTestEnv(page)
    
    // Given: 创建测试记录
    await addTestRecord(page, 'expense', '100', '餐饮', '测试记录')
    
    // Step 1: 编辑记录
    await test.step('Given 用户有一条记录, When 修改金额, Then 记录更新成功', async () => {
      await navigateTo(page, '账单')
      await page.locator('.group').filter({ hasText: '餐饮' }).first().click()
      
      await expect(page.getByRole('heading', { name: '编辑账单' })).toBeVisible()
      await page.locator('input[inputmode="decimal"]').fill('150')
      await page.getByRole('button', { name: '保存修改' }).click()
      
      await expect(page.getByRole('heading', { name: '账单' })).toBeVisible()
    })
    
    // Step 2: 删除记录
    await test.step('Given 用户有一条记录, When 删除记录, Then 记录从列表移除', async () => {
      const record = page.locator('.group').filter({ hasText: '餐饮' }).first()
      await record.hover()
      await record.locator('button').filter({ has: page.locator('.lucide-trash-2') }).click()
      
      await expect(page.getByText('确认删除')).toBeVisible()
      await page.getByRole('button', { name: '删除' }).click()
      
      await page.waitForTimeout(500)
    })
  })

  test('Scenario: 账本管理流程', async ({ page }) => {
    /**
     * Given 用户已登录
     * When 用户创建新账本
     * Then 账本创建成功并可切换
     */
    
    await initializeTestEnv(page)
    await navigateTo(page, '我的')
    
    await test.step('Given 用户在我的页面, When 创建新账本, Then 账本列表更新', async () => {
      // 等待账本加载
      await expect(page.getByText(/\d+ 个账本/)).toBeVisible({ timeout: 10000 })
      
      // 获取当前数量
      const countText = await page.getByText(/\d+ 个账本/).textContent()
      const currentCount = parseInt(countText?.match(/\d+/)?.[0] || '0')
      
      // 展开并创建
      await page.locator('.cursor-pointer').filter({ hasText: /个账本/ }).first().click()
      await page.getByText('新建账本').click()
      await page.locator('input[placeholder="输入账本名称"]').fill(`BDD测试账本_${Date.now()}`)
      await page.getByRole('button', { name: '创建' }).click()
      
      // 验证数量增加
      await expect(page.getByText(`${currentCount + 1} 个账本`)).toBeVisible({ timeout: 5000 })
    })
  })
})

// ==================== Feature: 响应式布局 ====================

test.describe('Feature: 响应式布局', () => {
  
  test.describe('Scenario: 移动端布局', () => {
    test('Given 用户使用移动设备, Then 应正确显示移动端布局', async ({ page }) => {
      await initializeTestEnv(page)
      
      // Then: 底部导航可见
      await expect(page.locator('nav button').filter({ hasText: '首页' })).toBeVisible()
      await expect(page.locator('nav button').filter({ hasText: '记账' })).toBeVisible()
      await expect(page.locator('nav button').filter({ hasText: '账单' })).toBeVisible()
      await expect(page.locator('nav button').filter({ hasText: '我的' })).toBeVisible()
      
      // Then: 卡片布局可见
      await expect(page.locator('.bg-gradient-to-br').first()).toBeVisible()
      
      // Then: 快捷按钮 2 列布局
      await expect(page.locator('.grid.grid-cols-2')).toBeVisible()
    })
  })
})
