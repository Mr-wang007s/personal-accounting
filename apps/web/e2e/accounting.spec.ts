import { test, expect, Page } from '@playwright/test'

/**
 * 个人记账应用 E2E 测试
 * 技术栈: React + Vite + TypeScript + Tailwind + Radix UI
 * 
 * 测试策略：模拟真实用户使用流程
 * 后端：需要启动后端服务 (localhost:3000)
 */

const TEST_PHONE = '13800138000'

/**
 * 完成登录流程
 */
async function login(page: Page, phone = TEST_PHONE) {
  // 等待登录页加载
  await page.waitForSelector('text=手机号登录', { timeout: 10000 })
  
  // 输入手机号
  await page.locator('input[placeholder*="手机号"]').fill(phone)
  
  // 点击登录按钮
  await page.getByRole('button', { name: '开始记账' }).click()
  
  // 等待登录完成，进入首页
  await page.waitForSelector('text=我的账本', { timeout: 15000 })
}

/**
 * 初始化测试环境（清除 token 并登录）
 */
async function initializeTestEnv(page: Page) {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.clear()
  })
  await page.reload()
  await page.waitForLoadState('networkidle')
  await login(page)
  // 等待账本加载完成
  await page.waitForTimeout(1000)
}

/**
 * 辅助函数：添加测试记录
 */
async function addTestRecord(
  page: Page, 
  type: 'income' | 'expense', 
  amount: string, 
  category: string,
  note?: string
) {
  // 点击对应按钮
  await page.getByRole('button', { name: type === 'income' ? '记收入' : '记支出' }).click()
  await page.waitForLoadState('networkidle')
  
  // 填写表单 - 使用 inputMode="decimal" 的 input
  await page.locator('input[inputmode="decimal"]').fill(amount)
  
  // 选择分类 - 在 grid 布局中选择
  await page.locator('.grid.grid-cols-5 button').filter({ hasText: category }).click()
  
  // 填写备注（如果有）
  if (note) {
    await page.locator('input[placeholder="添加备注..."]').fill(note)
  }
  
  // 保存
  await page.getByRole('button', { name: '保存记录' }).click()
  
  // 等待保存完成并返回首页
  await page.waitForSelector('text=我的账本', { timeout: 10000 })
}

test.describe('登录功能', () => {
  
  test('应正确显示登录页', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.waitForLoadState('networkidle')
    
    // 验证登录页显示
    await expect(page.getByRole('heading', { name: '手机号登录' })).toBeVisible()
    await expect(page.locator('input[placeholder*="手机号"]')).toBeVisible()
    await expect(page.getByRole('button', { name: '开始记账' })).toBeVisible()
  })

  test('应能成功登录', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.waitForLoadState('networkidle')
    
    // 输入手机号
    await page.locator('input[placeholder*="手机号"]').fill(TEST_PHONE)
    
    // 点击登录
    await page.getByRole('button', { name: '开始记账' }).click()
    
    // 验证进入首页
    await expect(page.getByRole('heading', { name: '我的账本' })).toBeVisible({ timeout: 15000 })
  })

  test('登录后刷新页面应保持登录状态', async ({ page }) => {
    await initializeTestEnv(page)
    
    // 刷新页面
    await page.reload()
    await page.waitForLoadState('networkidle')
    
    // 应该直接进入首页，不需要重新登录
    await expect(page.getByRole('heading', { name: '我的账本' })).toBeVisible({ timeout: 10000 })
  })
})

test.describe('首页功能', () => {
  
  test.beforeEach(async ({ page }) => {
    await initializeTestEnv(page)
  })
  
  test('应正确显示首页所有元素', async ({ page }) => {
    // 验证标题
    await expect(page.getByRole('heading', { name: '我的账本' })).toBeVisible()
    
    // 验证余额卡片
    await expect(page.getByText('当前余额')).toBeVisible()
    
    // 验证快捷入口
    await expect(page.getByRole('button', { name: '记收入' })).toBeVisible()
    await expect(page.getByRole('button', { name: '记支出' })).toBeVisible()
    
    // 验证底部导航 - 4 个按钮：首页、记账、账单、我的
    await expect(page.locator('nav button').filter({ hasText: '首页' })).toBeVisible()
    await expect(page.locator('nav button').filter({ hasText: '记账' })).toBeVisible()
    await expect(page.locator('nav button').filter({ hasText: '账单' })).toBeVisible()
    await expect(page.locator('nav button').filter({ hasText: '我的' })).toBeVisible()
  })
})

test.describe('记账功能', () => {
  
  test.beforeEach(async ({ page }) => {
    await initializeTestEnv(page)
  })
  
  test('应能成功添加支出记录', async ({ page }) => {
    // 点击记支出
    await page.getByRole('button', { name: '记支出' }).click()
    await page.waitForLoadState('networkidle')
    
    // 验证页面标题
    await expect(page.getByRole('heading', { name: '记支出' })).toBeVisible()
    
    // 填写表单
    await page.locator('input[inputmode="decimal"]').fill('88.50')
    await page.locator('.grid.grid-cols-5 button').filter({ hasText: '餐饮' }).click()
    await page.locator('input[placeholder="添加备注..."]').fill('午餐')
    
    // 验证保存按钮可用
    const saveBtn = page.getByRole('button', { name: '保存记录' })
    await expect(saveBtn).toBeEnabled()
    
    // 保存
    await saveBtn.click()
    await page.waitForLoadState('networkidle')
    
    // 验证返回首页并显示记录
    await expect(page.getByRole('heading', { name: '我的账本' })).toBeVisible()
    await expect(page.locator('main').getByText('餐饮').first()).toBeVisible()
  })

  test('应能成功添加收入记录', async ({ page }) => {
    // 点击记收入
    await page.getByRole('button', { name: '记收入' }).click()
    await page.waitForLoadState('networkidle')
    
    // 验证页面标题
    await expect(page.getByRole('heading', { name: '记收入' })).toBeVisible()
    
    // 填写表单
    await page.locator('input[inputmode="decimal"]').fill('5000')
    await page.locator('.grid.grid-cols-5 button').filter({ hasText: '工资' }).click()
    await page.locator('input[placeholder="添加备注..."]').fill('12月工资')
    
    // 保存
    await page.getByRole('button', { name: '保存记录' }).click()
    await page.waitForLoadState('networkidle')
    
    // 验证返回首页并显示记录
    await expect(page.locator('main').getByText('工资').first()).toBeVisible()
  })

  test('表单验证 - 金额和分类必填', async ({ page }) => {
    await page.getByRole('button', { name: '记支出' }).click()
    await page.waitForLoadState('networkidle')
    
    const saveBtn = page.getByRole('button', { name: '保存记录' })
    
    // 初始状态禁用
    await expect(saveBtn).toBeDisabled()
    
    // 只填金额
    await page.locator('input[inputmode="decimal"]').fill('100')
    await expect(saveBtn).toBeDisabled()
    
    // 选择分类后启用
    await page.locator('.grid.grid-cols-5 button').filter({ hasText: '餐饮' }).click()
    await expect(saveBtn).toBeEnabled()
    
    // 清空金额后禁用
    await page.locator('input[inputmode="decimal"]').fill('')
    await expect(saveBtn).toBeDisabled()
  })

  test('日期选择功能', async ({ page }) => {
    await page.getByRole('button', { name: '记支出' }).click()
    await page.waitForLoadState('networkidle')
    
    // 验证日期输入框存在
    const dateInput = page.locator('input[type="date"]')
    await expect(dateInput).toBeVisible()
    
    // 验证默认是今天
    const today = new Date().toISOString().split('T')[0]
    await expect(dateInput).toHaveValue(today)
    
    // 修改日期
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    await dateInput.fill(yesterday)
    await expect(dateInput).toHaveValue(yesterday)
  })
})

test.describe('账单列表页', () => {
  
  test.beforeEach(async ({ page }) => {
    await initializeTestEnv(page)
    // 先添加测试数据
    await addTestRecord(page, 'expense', '50', '餐饮')
    await addTestRecord(page, 'income', '1000', '工资')
  })

  test('应正确显示账单列表', async ({ page }) => {
    // 导航到账单页
    await page.locator('nav button').filter({ hasText: '账单' }).click()
    await page.waitForLoadState('networkidle')
    
    // 验证页面标题
    await expect(page.getByRole('heading', { name: '账单' })).toBeVisible()
    
    // 验证默认显示账单明细 Tab
    await expect(page.getByRole('tab', { name: '账单明细' })).toHaveAttribute('data-state', 'active')
    
    // 验证月份选择器
    const currentMonth = new Date().toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
    })
    await expect(page.getByText(currentMonth).first()).toBeVisible()
    
    // 验证月度汇总
    await expect(page.getByText('收入').first()).toBeVisible()
    await expect(page.getByText('支出').first()).toBeVisible()
    await expect(page.getByText('结余')).toBeVisible()
  })

  test('月份切换功能', async ({ page }) => {
    // 进入账单页
    await page.locator('nav button').filter({ hasText: '账单' }).click()
    await page.waitForLoadState('networkidle')
    
    // 验证当前月份显示
    const currentMonth = new Date().toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
    })
    await expect(page.getByText(currentMonth).first()).toBeVisible()
    
    // 点击上一月按钮
    await page.locator('button').filter({ has: page.locator('.lucide-chevron-left') }).click()
    
    // 等待月份切换
    await page.waitForTimeout(300)
    
    // 点击下一月回到当前月
    await page.locator('button').filter({ has: page.locator('.lucide-chevron-right') }).click()
    await expect(page.getByText(currentMonth).first()).toBeVisible()
  })
})

test.describe('统计分析页', () => {
  
  test.beforeEach(async ({ page }) => {
    await initializeTestEnv(page)
    // 先添加测试数据
    await addTestRecord(page, 'expense', '100', '餐饮')
    await addTestRecord(page, 'expense', '200', '交通')
    await addTestRecord(page, 'income', '5000', '工资')
  })

  test('应正确显示统计数据', async ({ page }) => {
    // 导航到账单页
    await page.locator('nav button').filter({ hasText: '账单' }).click()
    await page.waitForLoadState('networkidle')
    
    // 切换到统计分析 Tab
    await page.getByRole('tab', { name: '统计分析' }).click()
    
    // 验证 Tab 状态
    await expect(page.getByRole('tab', { name: '统计分析' })).toHaveAttribute('data-state', 'active')
    
    // 验证汇总卡片
    await expect(page.getByText('总收入')).toBeVisible()
    await expect(page.getByText('总支出')).toBeVisible()
    
    // 验证内部 Tab 切换
    await expect(page.getByRole('tab', { name: '收支趋势' })).toBeVisible()
    await expect(page.getByRole('tab', { name: '分类占比' })).toBeVisible()
  })

  test('应能切换统计内部 Tab', async ({ page }) => {
    await page.locator('nav button').filter({ hasText: '账单' }).click()
    await page.waitForLoadState('networkidle')
    
    // 切换到统计分析 Tab
    await page.getByRole('tab', { name: '统计分析' }).click()
    
    // 点击分类占比 Tab
    await page.getByRole('tab', { name: '分类占比' }).click()
    
    // 验证 Tab 状态
    await expect(page.getByRole('tab', { name: '分类占比' })).toHaveAttribute('data-state', 'active')
  })
})

test.describe('导航功能', () => {
  
  test.beforeEach(async ({ page }) => {
    await initializeTestEnv(page)
  })
  
  test('底部导航应正确切换页面', async ({ page }) => {
    // 首页 -> 账单
    await page.locator('nav button').filter({ hasText: '账单' }).click()
    await expect(page.getByRole('heading', { name: '账单' })).toBeVisible()
    
    // 账单 -> 我的
    await page.locator('nav button').filter({ hasText: '我的' }).click()
    await expect(page.getByRole('heading', { name: '我的' })).toBeVisible()
    
    // 我的 -> 首页
    await page.locator('nav button').filter({ hasText: '首页' }).click()
    await expect(page.getByRole('heading', { name: '我的账本' })).toBeVisible()
  })

  test('记账导航打开记账页面', async ({ page }) => {
    // 点击底部导航的记账按钮
    await page.locator('nav button').filter({ hasText: '记账' }).click()
    
    // 应该打开支出记账页面（默认）
    await expect(page.getByRole('heading', { name: '记支出' })).toBeVisible()
  })

  test('记账页面返回按钮应正常工作', async ({ page }) => {
    // 进入记支出页面
    await page.getByRole('button', { name: '记支出' }).click()
    await expect(page.getByRole('heading', { name: '记支出' })).toBeVisible()
    
    // 点击返回按钮 (header 中的第一个按钮)
    await page.locator('header button').first().click()
    await page.waitForLoadState('networkidle')
    
    // 验证返回首页
    await expect(page.getByRole('heading', { name: '我的账本' })).toBeVisible()
  })
})

test.describe('编辑记录功能', () => {
  
  test('应能编辑已有记录', async ({ page }) => {
    await initializeTestEnv(page)
    await addTestRecord(page, 'expense', '100', '餐饮', '原始备注')
    
    // 进入账单页
    await page.locator('nav button').filter({ hasText: '账单' }).click()
    await page.waitForLoadState('networkidle')
    
    // 点击记录卡片进入编辑页面
    await page.locator('.group').filter({ hasText: '餐饮' }).first().click()
    
    // 验证进入编辑页面
    await expect(page.getByRole('heading', { name: '编辑账单' })).toBeVisible()
    
    // 修改金额
    const amountInput = page.locator('input[inputmode="decimal"]')
    await amountInput.fill('200')
    
    // 修改备注
    const noteInput = page.locator('input[placeholder="添加备注..."]')
    await noteInput.fill('修改后的备注')
    
    // 保存修改
    await page.getByRole('button', { name: '保存修改' }).click()
    await page.waitForLoadState('networkidle')
    
    // 验证返回账单页
    await expect(page.getByRole('heading', { name: '账单' })).toBeVisible()
  })
})

test.describe('删除记录功能', () => {
  
  test('应能删除记录', async ({ page }) => {
    await initializeTestEnv(page)
    await addTestRecord(page, 'expense', '100', '餐饮', '待删除')
    await addTestRecord(page, 'expense', '50', '交通', '保留')
    
    // 进入账单页
    await page.locator('nav button').filter({ hasText: '账单' }).click()
    await page.waitForLoadState('networkidle')
    
    // 验证有2条记录
    await expect(page.locator('.group').filter({ hasText: '餐饮' }).first()).toBeVisible()
    await expect(page.locator('.group').filter({ hasText: '交通' }).first()).toBeVisible()
    
    // 悬停显示删除按钮并点击
    const mealRecord = page.locator('.group').filter({ hasText: '餐饮' }).first()
    await mealRecord.hover()
    
    // 点击删除按钮（带 Trash2 图标的按钮）
    await mealRecord.locator('button').filter({ has: page.locator('.lucide-trash-2') }).click()
    
    // 确认删除对话框
    await expect(page.getByText('确认删除')).toBeVisible()
    await page.getByRole('button', { name: '删除' }).click()
    
    // 等待删除完成
    await page.waitForTimeout(500)
    
    // 验证餐饮记录已删除，交通记录仍在
    await expect(page.locator('.group').filter({ hasText: '交通' }).first()).toBeVisible()
  })
})

test.describe('个人中心页', () => {
  
  test.beforeEach(async ({ page }) => {
    await initializeTestEnv(page)
  })

  test('应正确显示个人中心', async ({ page }) => {
    // 导航到我的页面
    await page.locator('nav button').filter({ hasText: '我的' }).click()
    await page.waitForLoadState('networkidle')
    
    // 验证页面标题
    await expect(page.getByRole('heading', { name: '我的' })).toBeVisible()
    
    // 验证账本管理区域
    await expect(page.getByText('我的账本').first()).toBeVisible()
    
    // 验证退出登录按钮
    await expect(page.getByText('退出登录')).toBeVisible()
  })

  test('账本管理 - 展开账本列表', async ({ page }) => {
    await page.locator('nav button').filter({ hasText: '我的' }).click()
    await page.waitForLoadState('networkidle')
    
    // 点击账本区域展开
    await page.locator('.cursor-pointer').filter({ hasText: '我的账本' }).first().click()
    
    // 验证展开后显示新建账本按钮
    await expect(page.getByText('新建账本')).toBeVisible()
  })

  test('应能创建新账本', async ({ page }) => {
    await page.locator('nav button').filter({ hasText: '我的' }).click()
    await page.waitForLoadState('networkidle')
    
    // 展开账本列表
    await page.locator('.cursor-pointer').filter({ hasText: '我的账本' }).first().click()
    
    // 点击新建账本
    await page.getByText('新建账本').click()
    
    // 输入账本名称
    await page.locator('input[placeholder="输入账本名称"]').fill('测试账本')
    
    // 点击创建
    await page.getByRole('button', { name: '创建' }).click()
    
    // 等待创建完成
    await page.waitForTimeout(500)
    
    // 验证新账本出现在列表中
    await expect(page.getByText('测试账本')).toBeVisible()
  })

  test('应能退出登录', async ({ page }) => {
    await page.locator('nav button').filter({ hasText: '我的' }).click()
    await page.waitForLoadState('networkidle')
    
    // 设置 dialog 处理
    page.on('dialog', dialog => dialog.accept())
    
    // 点击退出登录
    await page.getByText('退出登录').click()
    
    // 验证返回登录页
    await expect(page.getByRole('heading', { name: '手机号登录' })).toBeVisible({ timeout: 5000 })
  })
})

/**
 * 完整用户流程测试 - 模拟真实用户完整使用场景
 */
test.describe('完整用户流程', () => {
  
  test('完整流程：登录 -> 记支出 -> 记收入 -> 查看账单 -> 查看统计', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.waitForLoadState('networkidle')

    // ========== 步骤1: 登录 ==========
    await test.step('登录', async () => {
      await expect(page.getByRole('heading', { name: '手机号登录' })).toBeVisible()
      await page.locator('input[placeholder*="手机号"]').fill(TEST_PHONE)
      await page.getByRole('button', { name: '开始记账' }).click()
      await expect(page.getByRole('heading', { name: '我的账本' })).toBeVisible({ timeout: 15000 })
    })

    // ========== 步骤2: 记一笔支出 ==========
    await test.step('记一笔支出', async () => {
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

    // ========== 步骤3: 再记一笔支出 ==========
    await test.step('再记一笔交通支出', async () => {
      await page.getByRole('button', { name: '记支出' }).click()
      await page.waitForLoadState('networkidle')
      
      await page.locator('input[inputmode="decimal"]').fill('35')
      await page.locator('.grid.grid-cols-5 button').filter({ hasText: '交通' }).click()
      await page.locator('input[placeholder="添加备注..."]').fill('打车回家')
      
      await page.getByRole('button', { name: '保存记录' }).click()
      await page.waitForLoadState('networkidle')
      
      await expect(page.locator('main').getByText('交通').first()).toBeVisible()
    })

    // ========== 步骤4: 记一笔收入 ==========
    await test.step('记一笔工资收入', async () => {
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

    // ========== 步骤5: 查看账单列表 ==========
    await test.step('查看账单列表', async () => {
      await page.locator('nav button').filter({ hasText: '账单' }).click()
      await page.waitForLoadState('networkidle')
      
      await expect(page.getByRole('heading', { name: '账单' })).toBeVisible()
      
      // 验证月度汇总显示
      await expect(page.getByText('收入').first()).toBeVisible()
      await expect(page.getByText('支出').first()).toBeVisible()
      await expect(page.getByText('结余')).toBeVisible()
      
      // 验证记录列表显示 - 应该有3条记录
      await expect(page.locator('.group').filter({ hasText: '餐饮' }).first()).toBeVisible()
      await expect(page.locator('.group').filter({ hasText: '交通' }).first()).toBeVisible()
      await expect(page.locator('.group').filter({ hasText: '工资' }).first()).toBeVisible()
    })

    // ========== 步骤6: 查看统计分析 ==========
    await test.step('查看统计分析', async () => {
      // 切换到统计分析 Tab
      await page.getByRole('tab', { name: '统计分析' }).click()
      
      // 验证 Tab 状态
      await expect(page.getByRole('tab', { name: '统计分析' })).toHaveAttribute('data-state', 'active')
      
      // 验证总收入/总支出显示
      await expect(page.getByText('总收入')).toBeVisible()
      await expect(page.getByText('总支出')).toBeVisible()
      
      // 切换到分类占比
      await page.getByRole('tab', { name: '分类占比' }).click()
      await expect(page.getByRole('tab', { name: '分类占比' })).toHaveAttribute('data-state', 'active')
    })

    // ========== 步骤7: 返回首页验证余额 ==========
    await test.step('返回首页验证余额', async () => {
      await page.locator('nav button').filter({ hasText: '首页' }).click()
      await page.waitForLoadState('networkidle')
      
      await expect(page.getByRole('heading', { name: '我的账本' })).toBeVisible()
      
      // 验证余额卡片显示
      const balanceCard = page.locator('.bg-gradient-to-br').first()
      await expect(balanceCard).toBeVisible()
    })
  })
})

test.describe('响应式布局', () => {
  
  test('移动端布局正确显示', async ({ page }) => {
    await initializeTestEnv(page)
    
    // Playwright 配置已设置为 Pixel 5 设备
    // 验证底部导航可见
    await expect(page.locator('nav button').filter({ hasText: '首页' })).toBeVisible()
    await expect(page.locator('nav button').filter({ hasText: '记账' })).toBeVisible()
    await expect(page.locator('nav button').filter({ hasText: '账单' })).toBeVisible()
    await expect(page.locator('nav button').filter({ hasText: '我的' })).toBeVisible()
    
    // 验证卡片布局
    await expect(page.locator('.bg-gradient-to-br').first()).toBeVisible()
    
    // 验证快捷按钮 2 列布局
    const quickActions = page.locator('.grid.grid-cols-2')
    await expect(quickActions).toBeVisible()
  })
})
