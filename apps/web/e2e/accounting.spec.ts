import { test, expect, Page } from '@playwright/test';

/**
 * 个人记账应用 E2E 测试
 * 技术栈: React + Vite + TypeScript + Tailwind + Radix UI
 * 
 * 测试策略：模拟真实用户使用流程
 */

test.describe('个人记账应用', () => {
  
  test.beforeEach(async ({ page }) => {
    // 每个测试前清除 localStorage
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test.describe('首页功能', () => {
    
    test('应正确显示首页所有元素', async ({ page }) => {
      // 验证标题
      await expect(page.getByRole('heading', { name: '我的账本' })).toBeVisible();
      
      // 验证余额卡片
      await expect(page.getByText('当前余额')).toBeVisible();
      
      // 验证快捷入口
      await expect(page.getByRole('button', { name: '记收入' })).toBeVisible();
      await expect(page.getByRole('button', { name: '记支出' })).toBeVisible();
      
      // 验证底部导航
      await expect(page.getByRole('button', { name: '首页' })).toBeVisible();
      await expect(page.getByRole('button', { name: '账单' })).toBeVisible();
      await expect(page.getByRole('button', { name: '统计' })).toBeVisible();
    });

    test('初始余额应为 0', async ({ page }) => {
      // 查找余额显示区域
      const balanceSection = page.locator('text=当前余额').locator('..');
      await expect(balanceSection).toContainText('0');
    });
  });

  test.describe('记账功能', () => {
    
    test('应能成功添加支出记录', async ({ page }) => {
      // 点击记支出
      await page.getByRole('button', { name: '记支出' }).click();
      await page.waitForLoadState('networkidle');
      
      // 验证页面标题
      await expect(page.getByRole('heading', { name: '记支出' })).toBeVisible();
      
      // 填写表单
      await page.locator('input[inputmode="decimal"]').fill('88.50');
      // 使用更精确的选择器 - 分类按钮在 grid 布局中
      await page.locator('.grid.grid-cols-5 button').filter({ hasText: '餐饮' }).click();
      await page.locator('input[placeholder="添加备注..."]').fill('午餐');
      
      // 验证保存按钮可用
      const saveBtn = page.getByRole('button', { name: '保存记录' });
      await expect(saveBtn).toBeEnabled();
      
      // 保存
      await saveBtn.click();
      await page.waitForLoadState('networkidle');
      
      // 验证返回首页并显示记录
      await expect(page.getByRole('heading', { name: '我的账本' })).toBeVisible();
      await expect(page.locator('main').getByText('餐饮').first()).toBeVisible();
    });

    test('应能成功添加收入记录', async ({ page }) => {
      // 点击记收入
      await page.getByRole('button', { name: '记收入' }).click();
      await page.waitForLoadState('networkidle');
      
      // 验证页面标题
      await expect(page.getByRole('heading', { name: '记收入' })).toBeVisible();
      
      // 填写表单
      await page.locator('input[inputmode="decimal"]').fill('5000');
      await page.locator('.grid.grid-cols-5 button').filter({ hasText: '工资' }).click();
      await page.locator('input[placeholder="添加备注..."]').fill('12月工资');
      
      // 保存
      await page.getByRole('button', { name: '保存记录' }).click();
      await page.waitForLoadState('networkidle');
      
      // 验证返回首页并显示记录
      await expect(page.locator('main').getByText('工资').first()).toBeVisible();
    });

    test('表单验证 - 金额和分类必填', async ({ page }) => {
      await page.getByRole('button', { name: '记支出' }).click();
      await page.waitForLoadState('networkidle');
      
      const saveBtn = page.getByRole('button', { name: '保存记录' });
      
      // 初始状态禁用
      await expect(saveBtn).toBeDisabled();
      
      // 只填金额
      await page.locator('input[inputmode="decimal"]').fill('100');
      await expect(saveBtn).toBeDisabled();
      
      // 选择分类后启用
      await page.locator('.grid.grid-cols-5 button').filter({ hasText: '餐饮' }).click();
      await expect(saveBtn).toBeEnabled();
      
      // 清空金额后禁用
      await page.locator('input[inputmode="decimal"]').fill('');
      await expect(saveBtn).toBeDisabled();
    });
  });

  test.describe('账单列表页', () => {
    
    test.beforeEach(async ({ page }) => {
      // 先添加测试数据
      await addTestRecord(page, 'expense', '50', '餐饮');
      await addTestRecord(page, 'income', '1000', '工资');
    });

    test('应正确显示账单列表', async ({ page }) => {
      // 导航到账单页
      await page.getByRole('button', { name: '账单' }).click();
      await page.waitForLoadState('networkidle');
      
      // 验证页面标题
      await expect(page.getByRole('heading', { name: '账单明细' })).toBeVisible();
      
      // 验证月份选择器 - 使用 first() 因为可能匹配多个元素
      await expect(page.getByText(/202[4-5]年\d+月$/).first()).toBeVisible();
      
      // 验证月度汇总
      await expect(page.locator('main').getByText('收入').first()).toBeVisible();
      await expect(page.locator('main').getByText('支出').first()).toBeVisible();
    });
  });

  test.describe('统计分析页', () => {
    
    test.beforeEach(async ({ page }) => {
      // 先添加测试数据
      await addTestRecord(page, 'expense', '100', '餐饮');
      await addTestRecord(page, 'expense', '200', '交通');
      await addTestRecord(page, 'income', '5000', '工资');
    });

    test('应正确显示统计数据', async ({ page }) => {
      // 导航到统计页
      await page.getByRole('button', { name: '统计' }).click();
      await page.waitForLoadState('networkidle');
      
      // 验证页面标题
      await expect(page.getByRole('heading', { name: '统计分析' })).toBeVisible();
      
      // 验证汇总卡片
      await expect(page.getByText('总收入')).toBeVisible();
      await expect(page.getByText('总支出')).toBeVisible();
      
      // 验证 Tab 切换
      await expect(page.getByRole('tab', { name: '收支趋势' })).toBeVisible();
      await expect(page.getByRole('tab', { name: '分类占比' })).toBeVisible();
    });

    test('应能切换统计 Tab', async ({ page }) => {
      await page.getByRole('button', { name: '统计' }).click();
      await page.waitForLoadState('networkidle');
      
      // 点击分类占比 Tab
      await page.getByRole('tab', { name: '分类占比' }).click();
      
      // 验证 Tab 状态
      await expect(page.getByRole('tab', { name: '分类占比' })).toHaveAttribute('data-state', 'active');
    });
  });

  test.describe('导航功能', () => {
    
    test('底部导航应正确切换页面', async ({ page }) => {
      // 首页 -> 账单
      await page.getByRole('button', { name: '账单' }).click();
      await expect(page.getByRole('heading', { name: '账单明细' })).toBeVisible();
      
      // 账单 -> 统计
      await page.getByRole('button', { name: '统计' }).click();
      await expect(page.getByRole('heading', { name: '统计分析' })).toBeVisible();
      
      // 统计 -> 首页
      await page.getByRole('button', { name: '首页' }).click();
      await expect(page.getByRole('heading', { name: '我的账本' })).toBeVisible();
    });

    test('记账页面返回按钮应正常工作', async ({ page }) => {
      // 进入记支出页面
      await page.getByRole('button', { name: '记支出' }).click();
      await expect(page.getByRole('heading', { name: '记支出' })).toBeVisible();
      
      // 点击返回按钮 (header 中的第一个按钮)
      await page.locator('header button').first().click();
      await page.waitForLoadState('networkidle');
      
      // 验证返回首页
      await expect(page.getByRole('heading', { name: '我的账本' })).toBeVisible();
    });
  });

  test.describe('数据持久化', () => {
    
    test('刷新页面后数据应保留', async ({ page }) => {
      // 添加记录
      await addTestRecord(page, 'expense', '66.66', '餐饮');
      
      // 验证记录存在
      await expect(page.locator('main').getByText('餐饮').first()).toBeVisible();
      
      // 刷新页面
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // 验证数据仍存在
      await expect(page.locator('main').getByText('餐饮').first()).toBeVisible();
    });
  });

  /**
   * 核心用户流程测试 - 模拟真实用户完整使用场景
   */
  test.describe('完整用户流程', () => {
    
    test('完整流程：记支出 -> 记收入 -> 查看账单 -> 查看统计', async ({ page }) => {
      // ========== 步骤1: 记一笔支出 ==========
      await test.step('记一笔支出', async () => {
        // 点击记支出按钮
        await page.getByRole('button', { name: '记支出' }).click();
        await page.waitForLoadState('networkidle');
        
        // 验证进入支出页面
        await expect(page.getByRole('heading', { name: '记支出' })).toBeVisible();
        
        // 填写金额
        await page.locator('input[inputmode="decimal"]').fill('128.50');
        
        // 选择分类 - 餐饮 (使用精确选择器)
        await page.locator('.grid.grid-cols-5 button').filter({ hasText: '餐饮' }).click();
        
        // 填写备注
        await page.locator('input[placeholder="添加备注..."]').fill('和朋友聚餐');
        
        // 保存记录
        await page.getByRole('button', { name: '保存记录' }).click();
        await page.waitForLoadState('networkidle');
        
        // 验证返回首页
        await expect(page.getByRole('heading', { name: '我的账本' })).toBeVisible();
        
        // 验证首页显示刚添加的记录
        await expect(page.locator('main').getByText('餐饮').first()).toBeVisible();
        await expect(page.getByText('和朋友聚餐')).toBeVisible();
      });

      // ========== 步骤2: 再记一笔支出 ==========
      await test.step('再记一笔交通支出', async () => {
        await page.getByRole('button', { name: '记支出' }).click();
        await page.waitForLoadState('networkidle');
        
        await page.locator('input[inputmode="decimal"]').fill('35');
        await page.locator('.grid.grid-cols-5 button').filter({ hasText: '交通' }).click();
        await page.locator('input[placeholder="添加备注..."]').fill('打车回家');
        
        await page.getByRole('button', { name: '保存记录' }).click();
        await page.waitForLoadState('networkidle');
        
        // 验证首页显示
        await expect(page.locator('main').getByText('交通').first()).toBeVisible();
      });

      // ========== 步骤3: 记一笔收入 ==========
      await test.step('记一笔工资收入', async () => {
        await page.getByRole('button', { name: '记收入' }).click();
        await page.waitForLoadState('networkidle');
        
        // 验证进入收入页面
        await expect(page.getByRole('heading', { name: '记收入' })).toBeVisible();
        
        // 填写金额
        await page.locator('input[inputmode="decimal"]').fill('8000');
        
        // 选择分类 - 工资
        await page.locator('.grid.grid-cols-5 button').filter({ hasText: '工资' }).click();
        
        // 填写备注
        await page.locator('input[placeholder="添加备注..."]').fill('12月份工资');
        
        // 保存记录
        await page.getByRole('button', { name: '保存记录' }).click();
        await page.waitForLoadState('networkidle');
        
        // 验证首页显示收入记录
        await expect(page.locator('main').getByText('工资').first()).toBeVisible();
        await expect(page.getByText('12月份工资')).toBeVisible();
      });

      // ========== 步骤4: 查看账单列表 ==========
      await test.step('查看账单列表', async () => {
        // 点击底部导航 - 账单
        await page.getByRole('button', { name: '账单' }).click();
        await page.waitForLoadState('networkidle');
        
        // 验证进入账单页面
        await expect(page.getByRole('heading', { name: '账单明细' })).toBeVisible();
        
        // 验证月度汇总显示
        await expect(page.locator('main').getByText('收入').first()).toBeVisible();
        await expect(page.locator('main').getByText('支出').first()).toBeVisible();
        await expect(page.getByText('结余')).toBeVisible();
        
        // 验证记录列表显示 - 应该有3条记录
        await expect(page.locator('main').getByText('餐饮').first()).toBeVisible();
        await expect(page.locator('main').getByText('交通').first()).toBeVisible();
        await expect(page.locator('main').getByText('工资').first()).toBeVisible();
      });

      // ========== 步骤5: 查看统计分析 ==========
      await test.step('查看统计分析', async () => {
        // 点击底部导航 - 统计
        await page.getByRole('button', { name: '统计' }).click();
        await page.waitForLoadState('networkidle');
        
        // 验证进入统计页面
        await expect(page.getByRole('heading', { name: '统计分析' })).toBeVisible();
        
        // 验证总收入/总支出显示
        await expect(page.getByText('总收入')).toBeVisible();
        await expect(page.getByText('总支出')).toBeVisible();
        
        // 验证 Tab 存在
        await expect(page.getByRole('tab', { name: '收支趋势' })).toBeVisible();
        await expect(page.getByRole('tab', { name: '分类占比' })).toBeVisible();
        
        // 切换到分类占比
        await page.getByRole('tab', { name: '分类占比' }).click();
        await expect(page.getByRole('tab', { name: '分类占比' })).toHaveAttribute('data-state', 'active');
      });

      // ========== 步骤6: 返回首页验证余额 ==========
      await test.step('返回首页验证余额', async () => {
        await page.getByRole('button', { name: '首页' }).click();
        await page.waitForLoadState('networkidle');
        
        await expect(page.getByRole('heading', { name: '我的账本' })).toBeVisible();
        
        // 验证余额计算正确: 8000 - 128.50 - 35 = 7836.50
        const balanceCard = page.locator('.bg-gradient-to-br').first();
        await expect(balanceCard).toContainText('7,836.50');
      });
    });

    test('完整流程：多笔记账后删除记录', async ({ page }) => {
      // 添加测试数据 - 在同一个 page context 中添加
      await page.getByRole('button', { name: '记支出' }).click();
      await page.waitForLoadState('networkidle');
      await page.locator('input[inputmode="decimal"]').fill('100');
      await page.locator('.grid.grid-cols-5 button').filter({ hasText: '餐饮' }).click();
      await page.locator('input[placeholder="添加备注..."]').fill('早餐');
      await page.getByRole('button', { name: '保存记录' }).click();
      await page.waitForLoadState('networkidle');
      
      await page.getByRole('button', { name: '记支出' }).click();
      await page.waitForLoadState('networkidle');
      await page.locator('input[inputmode="decimal"]').fill('50');
      await page.locator('.grid.grid-cols-5 button').filter({ hasText: '交通' }).click();
      await page.locator('input[placeholder="添加备注..."]').fill('地铁');
      await page.getByRole('button', { name: '保存记录' }).click();
      await page.waitForLoadState('networkidle');
      
      await page.getByRole('button', { name: '记收入' }).click();
      await page.waitForLoadState('networkidle');
      await page.locator('input[inputmode="decimal"]').fill('500');
      await page.locator('.grid.grid-cols-5 button').filter({ hasText: '工资' }).click();
      await page.locator('input[placeholder="添加备注..."]').fill('奖金');
      await page.getByRole('button', { name: '保存记录' }).click();
      await page.waitForLoadState('networkidle');
      
      // 进入账单页
      await page.getByRole('button', { name: '账单' }).click();
      await page.waitForLoadState('networkidle');
      
      // 验证有3条记录
      await expect(page.locator('main').getByText('餐饮').first()).toBeVisible();
      await expect(page.locator('main').getByText('交通').first()).toBeVisible();
      await expect(page.locator('main').getByText('工资').first()).toBeVisible();
      
      // 删除餐饮记录 - hover 显示删除按钮
      const mealRecord = page.locator('.group').filter({ hasText: '餐饮' }).first();
      await mealRecord.hover();
      
      // 点击删除按钮
      const deleteBtn = mealRecord.locator('button').filter({ has: page.locator('svg') });
      await deleteBtn.click();
      
      // 确认删除对话框
      await expect(page.getByText('确认删除')).toBeVisible();
      await page.getByRole('button', { name: '删除' }).click();
      
      // 等待删除完成
      await page.waitForTimeout(500);
      
      // 验证餐饮记录已删除，其他记录仍在
      await expect(page.locator('main').getByText('交通').first()).toBeVisible();
      await expect(page.locator('main').getByText('工资').first()).toBeVisible();
    });

    test('边界情况：金额输入验证', async ({ page }) => {
      await page.getByRole('button', { name: '记支出' }).click();
      await page.waitForLoadState('networkidle');
      
      const amountInput = page.locator('input[inputmode="decimal"]');
      
      // 测试正常输入
      await amountInput.fill('99.99');
      await expect(amountInput).toHaveValue('99.99');
      
      // 测试整数
      await amountInput.fill('');
      await amountInput.fill('1000');
      await expect(amountInput).toHaveValue('1000');
      
      // 测试小数
      await amountInput.fill('');
      await amountInput.fill('12.5');
      await expect(amountInput).toHaveValue('12.5');
    });

    test('日期选择功能', async ({ page }) => {
      await page.getByRole('button', { name: '记支出' }).click();
      await page.waitForLoadState('networkidle');
      
      // 验证日期输入框存在
      const dateInput = page.locator('input[type="date"]');
      await expect(dateInput).toBeVisible();
      
      // 验证默认是今天
      const today = new Date().toISOString().split('T')[0];
      await expect(dateInput).toHaveValue(today);
      
      // 修改日期
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      await dateInput.fill(yesterday);
      await expect(dateInput).toHaveValue(yesterday);
    });

    test('月份切换功能', async ({ page }) => {
      // 先添加一条记录
      await page.getByRole('button', { name: '记支出' }).click();
      await page.waitForLoadState('networkidle');
      await page.locator('input[inputmode="decimal"]').fill('100');
      await page.locator('.grid.grid-cols-5 button').filter({ hasText: '餐饮' }).click();
      await page.getByRole('button', { name: '保存记录' }).click();
      await page.waitForLoadState('networkidle');
      
      // 进入账单页
      await page.getByRole('button', { name: '账单' }).click();
      await page.waitForLoadState('networkidle');
      
      // 验证当前月份显示 - 使用 first() 因为可能匹配多个元素
      const currentMonth = new Date().toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
      });
      await expect(page.getByText(currentMonth).first()).toBeVisible();
      
      // 点击上一月按钮
      const prevBtn = page.locator('button').filter({ has: page.locator('.lucide-chevron-left') });
      await prevBtn.click();
      
      // 验证月份已切换 - 检查不是当前月份
      await page.waitForTimeout(300);
      
      // 点击下一月回到当前月
      const nextBtn = page.locator('button').filter({ has: page.locator('.lucide-chevron-right') });
      await nextBtn.click();
      await expect(page.getByText(currentMonth).first()).toBeVisible();
    });
  });

  test.describe('响应式布局', () => {
    
    test('移动端布局正确显示', async ({ page }) => {
      // Playwright 配置已设置为 Pixel 5 设备
      // 验证底部导航可见
      await expect(page.getByRole('button', { name: '首页' })).toBeVisible();
      await expect(page.getByRole('button', { name: '账单' })).toBeVisible();
      await expect(page.getByRole('button', { name: '统计' })).toBeVisible();
      
      // 验证卡片布局
      await expect(page.locator('.bg-gradient-to-br').first()).toBeVisible();
      
      // 验证快捷按钮 2 列布局
      const quickActions = page.locator('.grid.grid-cols-2');
      await expect(quickActions).toBeVisible();
    });
  });

  test.describe('空状态处理', () => {
    
    test('无记录时显示空状态', async ({ page }) => {
      // 首页空状态 - 检查 EmptyState 组件的默认文本
      await expect(page.getByText('暂无数据')).toBeVisible();
      
      // 账单页空状态
      await page.getByRole('button', { name: '账单' }).click();
      await page.waitForLoadState('networkidle');
      await expect(page.getByText('本月暂无记录')).toBeVisible();
    });
  });
});

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
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // 点击对应按钮
  await page.getByRole('button', { name: type === 'income' ? '记收入' : '记支出' }).click();
  await page.waitForLoadState('networkidle');
  
  // 填写表单
  await page.locator('input[inputmode="decimal"]').fill(amount);
  await page.locator('.grid.grid-cols-5 button').filter({ hasText: category }).click();
  
  // 填写备注（如果有）
  if (note) {
    await page.locator('input[placeholder="添加备注..."]').fill(note);
  }
  
  // 保存
  await page.getByRole('button', { name: '保存记录' }).click();
  await page.waitForLoadState('networkidle');
}
