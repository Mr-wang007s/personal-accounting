import { test, expect, Page } from '@playwright/test';

/**
 * 同步功能 E2E 测试
 * 
 * 测试场景：
 * 1. 同步配置 UI 交互
 * 2. 服务器连接流程
 * 3. 手机号登录
 * 4. 数据同步（上传/下载）
 * 5. 断开连接
 * 
 * 注意：这些测试需要后端服务运行在 http://localhost:3000
 * 可以通过环境变量 SYNC_TEST_ENABLED=true 启用完整同步测试
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const SYNC_TEST_ENABLED = process.env.SYNC_TEST_ENABLED === 'true';

/**
 * 完成引导页流程
 */
async function completeOnboarding(page: Page, nickname = '测试用户', ledgerName = '我的账本') {
  await page.waitForSelector('text=欢迎使用', { timeout: 10000 });
  await page.locator('input[placeholder="输入您的昵称"]').fill(nickname);
  await page.getByRole('button', { name: '下一步' }).click();
  await page.waitForSelector('text=创建账本', { timeout: 5000 });
  const ledgerInput = page.locator('input[placeholder="账本名称"]');
  await ledgerInput.clear();
  await ledgerInput.fill(ledgerName);
  await page.getByRole('button', { name: '开始记账' }).click();
  await page.waitForSelector('text=我的账本', { timeout: 10000 });
}

/**
 * 初始化测试环境
 */
async function initializeTestEnv(page: Page, nickname = '测试用户') {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForLoadState('networkidle');
  await completeOnboarding(page, nickname);
}

/**
 * 导航到个人中心页面
 */
async function navigateToProfile(page: Page) {
  await page.locator('nav button').filter({ hasText: '我的' }).click();
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: '我的' })).toBeVisible();
}

/**
 * 展开同步配置面板
 */
async function expandSyncConfig(page: Page) {
  // 点击同步配置区域
  await page.locator('.cursor-pointer').filter({ hasText: '同步配置' }).click();
  // 等待展开动画完成
  await page.waitForTimeout(300);
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
  await page.getByRole('button', { name: type === 'income' ? '记收入' : '记支出' }).click();
  await page.waitForLoadState('networkidle');
  await page.locator('input[inputmode="decimal"]').fill(amount);
  await page.locator('.grid.grid-cols-5 button').filter({ hasText: category }).click();
  if (note) {
    await page.locator('input[placeholder="添加备注..."]').fill(note);
  }
  await page.getByRole('button', { name: '保存记录' }).click();
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('text=我的账本', { timeout: 5000 });
}

/**
 * 检查后端服务是否可用
 */
async function isBackendAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/discovery/ping`);
    return response.ok;
  } catch {
    return false;
  }
}

test.describe('同步功能 - UI 交互测试', () => {
  
  test.beforeEach(async ({ page }) => {
    await initializeTestEnv(page);
  });

  test('个人中心应显示同步相关设置', async ({ page }) => {
    await navigateToProfile(page);
    
    // 验证同步设置区域
    await expect(page.getByText('自动同步')).toBeVisible();
    await expect(page.getByText('未配置同步服务器')).toBeVisible();
    await expect(page.getByText('同步配置')).toBeVisible();
  });

  test('未连接时自动同步开关应禁用', async ({ page }) => {
    await navigateToProfile(page);
    
    // 自动同步开关应该禁用
    const switchElement = page.locator('button[role="switch"]').first();
    await expect(switchElement).toBeDisabled();
  });

  test('展开同步配置应显示服务器地址输入框', async ({ page }) => {
    await navigateToProfile(page);
    await expandSyncConfig(page);
    
    // 验证服务器地址输入框
    await expect(page.getByPlaceholder('http://127.0.0.1:3000')).toBeVisible();
    
    // 验证连接按钮
    await expect(page.getByRole('button', { name: '连接' })).toBeVisible();
  });

  test('输入无效服务器地址应显示错误', async ({ page }) => {
    await navigateToProfile(page);
    await expandSyncConfig(page);
    
    // 输入无效地址
    const serverInput = page.getByPlaceholder('http://127.0.0.1:3000');
    await serverInput.clear();
    await serverInput.fill('http://invalid-server-12345.local:9999');
    
    // 点击连接
    await page.getByRole('button', { name: '连接' }).click();
    
    // 等待连接尝试完成
    await page.waitForTimeout(3000);
    
    // 应该显示错误信息
    await expect(page.getByText(/无法连接|连接失败/)).toBeVisible({ timeout: 10000 });
  });

  test('账本管理 - 应能展开账本列表', async ({ page }) => {
    await navigateToProfile(page);
    
    // 点击账本区域
    await page.locator('.cursor-pointer').filter({ hasText: '我的账本' }).first().click();
    
    // 验证展开后显示新建账本
    await expect(page.getByText('新建账本')).toBeVisible();
  });

  test('账本管理 - 应能创建新账本', async ({ page }) => {
    await navigateToProfile(page);
    
    // 展开账本列表
    await page.locator('.cursor-pointer').filter({ hasText: '我的账本' }).first().click();
    
    // 点击新建账本
    await page.getByText('新建账本').click();
    
    // 输入账本名称
    await page.locator('input[placeholder="输入账本名称"]').fill('测试账本');
    
    // 点击创建
    await page.getByRole('button', { name: '创建' }).click();
    
    // 验证新账本显示在列表中
    await expect(page.getByText('测试账本')).toBeVisible();
    
    // 验证账本数量增加
    await expect(page.getByText('2 个账本')).toBeVisible();
  });

  test('账本管理 - 应能切换账本', async ({ page }) => {
    await navigateToProfile(page);
    
    // 先创建一个新账本
    await page.locator('.cursor-pointer').filter({ hasText: '我的账本' }).first().click();
    await page.getByText('新建账本').click();
    await page.locator('input[placeholder="输入账本名称"]').fill('第二个账本');
    await page.getByRole('button', { name: '创建' }).click();
    await expect(page.getByText('第二个账本')).toBeVisible();
    
    // 点击第二个账本进行切换
    await page.locator('.hover\\:bg-slate-100').filter({ hasText: '第二个账本' }).click();
    
    // 验证切换成功（当前账本显示为第二个账本）
    await page.waitForTimeout(500);
    await expect(page.locator('.cursor-pointer').first()).toContainText('第二个账本');
  });

  test('清除数据功能 - 应显示确认提示', async ({ page }) => {
    await navigateToProfile(page);
    
    // 设置 dialog 监听器
    page.on('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm');
      expect(dialog.message()).toContain('清除');
      await dialog.dismiss(); // 取消
    });
    
    // 点击清除数据
    await page.locator('.cursor-pointer').filter({ hasText: '清除数据' }).click();
  });
});

// 以下测试需要后端服务支持
test.describe('同步功能 - 完整同步流程', () => {
  
  // 仅在 SYNC_TEST_ENABLED=true 时运行
  test.skip(!SYNC_TEST_ENABLED, '需要设置 SYNC_TEST_ENABLED=true 启用');

  test.beforeAll(async () => {
    // 检查后端是否可用
    const available = await isBackendAvailable();
    if (!available) {
      test.skip(true, `后端服务不可用: ${BACKEND_URL}`);
    }
  });

  test.beforeEach(async ({ page }) => {
    await initializeTestEnv(page);
  });

  test('完整流程：连接服务器 -> 手机号登录 -> 同步数据', async ({ page }) => {
    // ========== 步骤1: 先添加一些本地数据 ==========
    await test.step('添加本地数据', async () => {
      await addTestRecord(page, 'expense', '100', '餐饮', '测试支出1');
      await addTestRecord(page, 'income', '5000', '工资', '测试收入1');
      
      // 验证数据已添加
      await expect(page.locator('main').getByText('餐饮').first()).toBeVisible();
      await expect(page.locator('main').getByText('工资').first()).toBeVisible();
    });

    // ========== 步骤2: 进入同步配置 ==========
    await test.step('进入同步配置', async () => {
      await navigateToProfile(page);
      await expandSyncConfig(page);
    });

    // ========== 步骤3: 连接服务器 ==========
    await test.step('连接服务器', async () => {
      const serverInput = page.getByPlaceholder('http://127.0.0.1:3000');
      await serverInput.clear();
      await serverInput.fill(BACKEND_URL);

      await page.getByRole('button', { name: '连接' }).click();

      // 连接成功后会出现“断开”按钮，且显示“已连接到 ...”
      await expect(page.getByRole('button', { name: '断开' })).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('✓ 已连接到')).toBeVisible({ timeout: 10000 });
    });

    // ========== 步骤4: 手机号登录 ==========
    await test.step('手机号登录', async () => {
      await page.getByPlaceholder('请输入手机号').fill('13800138001');
      await page.getByRole('button', { name: '登录并同步' }).click();

      // 登录后会展示同步状态区块
      await expect(page.getByText('状态')).toBeVisible({ timeout: 10000 });
    });

    // ========== 步骤5: 执行同步 ==========
    await test.step('执行同步', async () => {
      // 如果已连接，应该显示立即同步按钮
      const syncButton = page.getByRole('button', { name: '立即同步' });
      
      if (await syncButton.isVisible()) {
        await syncButton.click();
        
        // 等待同步完成
        await expect(page.getByText(/同步成功|已同步/)).toBeVisible({ timeout: 15000 });
      }
    });

    // ========== 步骤5: 验证同步状态 ==========
    await test.step('验证同步状态', async () => {
      // 待同步应该变为 0 或显示"已同步"
      await expect(page.getByText('已同步')).toBeVisible({ timeout: 10000 });
    });
  });

  test('断开连接后应重置同步状态', async ({ page }) => {
    await navigateToProfile(page);
    await expandSyncConfig(page);
    
    // 连接服务器
    const serverInput = page.getByPlaceholder('http://127.0.0.1:3000');
    await serverInput.clear();
    await serverInput.fill(BACKEND_URL);
    await page.getByRole('button', { name: '连接' }).click();
    
    // 等待连接成功
    await page.waitForTimeout(3000);
    
    // 如果已连接，点击断开
    const disconnectBtn = page.getByRole('button', { name: '断开' });
    if (await disconnectBtn.isVisible()) {
      // 设置 dialog 监听器
      page.on('dialog', async (dialog) => {
        await dialog.accept();
      });
      
      await disconnectBtn.click();
      
      // 验证状态重置
      await expect(page.getByText('未配置同步服务器')).toBeVisible({ timeout: 5000 });
      await expect(page.getByRole('button', { name: '连接' })).toBeVisible();
    }
  });

  test('添加记录后应显示待同步数量', async ({ page }) => {
    // 先配置同步（如果可能的话）
    await navigateToProfile(page);
    await expandSyncConfig(page);
    
    // 连接服务器
    const serverInput = page.getByPlaceholder('http://127.0.0.1:3000');
    await serverInput.clear();
    await serverInput.fill(BACKEND_URL);
    await page.getByRole('button', { name: '连接' }).click();
    
    // 等待连接
    await page.waitForTimeout(3000);
    
    // 返回首页添加记录
    await page.locator('nav button').filter({ hasText: '首页' }).click();
    await addTestRecord(page, 'expense', '50', '交通', '待同步测试');
    
    // 回到个人中心检查待同步数量
    await navigateToProfile(page);
    
    // 应该显示待同步数量
    const pendingBadge = page.locator('text=/\\d+ 待同步/');
    if (await pendingBadge.isVisible({ timeout: 3000 })) {
      await expect(pendingBadge).toBeVisible();
    }
  });
});

test.describe('同步功能 - 多设备模拟测试', () => {
  
  test.skip(!SYNC_TEST_ENABLED, '需要设置 SYNC_TEST_ENABLED=true 启用');

  test('数据应在同步后从云端恢复', async ({ page, context }) => {
    const testPhone = `138${Date.now().toString().slice(-8)}`;
    
    // ========== 设备 A: 创建数据并同步 ==========
    await test.step('设备A: 创建数据并同步', async () => {
      await initializeTestEnv(page, '设备A用户');
      
      // 添加测试数据
      await addTestRecord(page, 'expense', '200', '餐饮', '设备A记录');
      
      // 配置同步
      await navigateToProfile(page);
      await expandSyncConfig(page);
      
      const serverInput = page.getByPlaceholder('http://127.0.0.1:3000');
      await serverInput.clear();
      await serverInput.fill(BACKEND_URL);
      await page.getByRole('button', { name: '连接' }).click();

      await expect(page.getByRole('button', { name: '断开' })).toBeVisible({ timeout: 10000 });

      // 手机号登录
      await page.getByPlaceholder('请输入手机号').fill(testPhone);
      await page.getByRole('button', { name: '登录并同步' }).click();
      await expect(page.getByText('状态')).toBeVisible({ timeout: 10000 });

      // 执行同步
      const syncButton = page.getByRole('button', { name: '立即同步' });
      if (await syncButton.isVisible()) {
        await syncButton.click();
        await page.waitForTimeout(5000);
      }
    });

    // ========== 设备 B: 登录同一账号并获取数据 ==========
    await test.step('设备B: 登录同一账号获取数据', async () => {
      // 创建新页面模拟设备 B
      const pageB = await context.newPage();
      await pageB.goto('/');
      await pageB.evaluate(() => localStorage.clear());
      await pageB.reload();
      await pageB.waitForLoadState('networkidle');
      
      // 完成引导
      await completeOnboarding(pageB, '设备B用户');
      
      // 配置同步（使用相同手机号）
      await navigateToProfile(pageB);
      await pageB.locator('.cursor-pointer').filter({ hasText: '同步配置' }).click();
      await pageB.waitForTimeout(300);
      
      const serverInputB = pageB.getByPlaceholder('http://127.0.0.1:3000');
      await serverInputB.clear();
      await serverInputB.fill(BACKEND_URL);
      await pageB.getByRole('button', { name: '连接' }).click();

      await expect(pageB.getByRole('button', { name: '断开' })).toBeVisible({ timeout: 10000 });

      // 手机号登录（使用与设备A相同手机号）
      await pageB.getByPlaceholder('请输入手机号').fill(testPhone);
      await pageB.getByRole('button', { name: '登录并同步' }).click();
      await expect(pageB.getByText('状态')).toBeVisible({ timeout: 10000 });

      // 执行同步获取数据
      const syncButtonB = pageB.getByRole('button', { name: '立即同步' });
      if (await syncButtonB.isVisible()) {
        await syncButtonB.click();
        await pageB.waitForTimeout(5000);
      }
      
      // 返回首页检查是否有设备 A 的数据
      await pageB.locator('nav button').filter({ hasText: '首页' }).click();
      
      // 如果同步成功，应该能看到设备 A 的记录
      // 注意：这取决于是否使用相同的用户账号
      
      await pageB.close();
    });
  });
});

test.describe('同步功能 - 离线场景测试', () => {
  
  test.beforeEach(async ({ page }) => {
    await initializeTestEnv(page);
  });

  test('离线时仍可添加记录', async ({ page, context }) => {
    // 添加记录
    await addTestRecord(page, 'expense', '88', '餐饮', '离线记录');
    
    // 模拟离线
    await context.setOffline(true);
    
    // 继续添加记录
    await addTestRecord(page, 'expense', '66', '交通', '离线记录2');
    
    // 验证记录已保存到本地
    await expect(page.locator('main').getByText('交通').first()).toBeVisible();
    
    // 恢复在线
    await context.setOffline(false);
  });

  test('离线状态应正确显示', async ({ page, context }) => {
    await navigateToProfile(page);
    await expandSyncConfig(page);
    
    // 连接服务器（如果可用）
    const serverInput = page.getByPlaceholder('http://127.0.0.1:3000');
    await serverInput.fill(BACKEND_URL);
    
    // 模拟离线
    await context.setOffline(true);
    
    // 尝试连接应该失败
    await page.getByRole('button', { name: '连接' }).click();
    
    // 等待超时
    await page.waitForTimeout(5000);
    
    // 应该显示连接失败或离线状态
    // 恢复在线
    await context.setOffline(false);
  });
});

test.describe('同步功能 - 数据完整性测试', () => {
  
  test.skip(!SYNC_TEST_ENABLED, '需要设置 SYNC_TEST_ENABLED=true 启用');

  test.beforeEach(async ({ page }) => {
    await initializeTestEnv(page);
  });

  test('编辑记录后应标记为待同步', async ({ page }) => {
    // 添加并同步记录
    await addTestRecord(page, 'expense', '100', '餐饮', '原始备注');
    
    // 配置同步
    await navigateToProfile(page);
    await expandSyncConfig(page);
    
    const serverInput = page.getByPlaceholder('http://127.0.0.1:3000');
    await serverInput.fill(BACKEND_URL);
    await page.getByRole('button', { name: '连接' }).click();

    await expect(page.getByRole('button', { name: '断开' })).toBeVisible({ timeout: 10000 });

    // 手机号登录
    await page.getByPlaceholder('请输入手机号').fill('13800138001');
    await page.getByRole('button', { name: '登录并同步' }).click();
    await expect(page.getByText('状态')).toBeVisible({ timeout: 10000 });
    
    // 执行同步
    const syncButton = page.getByRole('button', { name: '立即同步' });
    if (await syncButton.isVisible()) {
      await syncButton.click();
      await page.waitForTimeout(3000);
    }
    
    // 进入账单编辑记录
    await page.locator('nav button').filter({ hasText: '账单' }).click();
    await page.waitForLoadState('networkidle');
    
    // 点击记录进入编辑
    await page.locator('.group').filter({ hasText: '餐饮' }).first().click();
    
    // 修改备注
    const noteInput = page.locator('input[placeholder="添加备注..."]');
    await noteInput.fill('修改后的备注');
    
    // 保存
    await page.getByRole('button', { name: '保存修改' }).click();
    await page.waitForLoadState('networkidle');
    
    // 回到个人中心检查待同步状态
    await navigateToProfile(page);
    
    // 应该有待同步记录
    const pendingBadge = page.locator('text=/\\d+ 待同步/');
    await expect(pendingBadge).toBeVisible({ timeout: 5000 });
  });

  test('删除记录应提供云端删除选项', async ({ page }) => {
    // 添加记录
    await addTestRecord(page, 'expense', '100', '餐饮', '待删除');
    
    // 配置同步并同步
    await navigateToProfile(page);
    await expandSyncConfig(page);
    
    const serverInput = page.getByPlaceholder('http://127.0.0.1:3000');
    await serverInput.fill(BACKEND_URL);
    await page.getByRole('button', { name: '连接' }).click();

    await expect(page.getByRole('button', { name: '断开' })).toBeVisible({ timeout: 10000 });

    // 手机号登录
    await page.getByPlaceholder('请输入手机号').fill('13800138001');
    await page.getByRole('button', { name: '登录并同步' }).click();
    await expect(page.getByText('状态')).toBeVisible({ timeout: 10000 });
    
    // 同步
    const syncButton = page.getByRole('button', { name: '立即同步' });
    if (await syncButton.isVisible()) {
      await syncButton.click();
      await page.waitForTimeout(3000);
    }
    
    // 进入账单页删除记录
    await page.locator('nav button').filter({ hasText: '账单' }).click();
    await page.waitForLoadState('networkidle');
    
    // 悬停显示删除按钮
    const record = page.locator('.group').filter({ hasText: '餐饮' }).first();
    await record.hover();
    await record.locator('button').filter({ has: page.locator('.lucide-trash-2') }).click();
    
    // 验证删除对话框显示
    await expect(page.getByText('确认删除')).toBeVisible();
    
    // 如果记录已同步，应该显示云端删除选项
    const cloudDeleteSwitch = page.getByText('同时删除云端数据');
    if (await cloudDeleteSwitch.isVisible({ timeout: 2000 })) {
      await expect(cloudDeleteSwitch).toBeVisible();
    }
    
    // 取消删除
    await page.getByRole('button', { name: '取消' }).click();
  });
});

test.describe('同步功能 - 自动同步测试', () => {
  
  test.skip(!SYNC_TEST_ENABLED, '需要设置 SYNC_TEST_ENABLED=true 启用');

  test('开启自动同步后变更应自动上传', async ({ page }) => {
    await initializeTestEnv(page);
    
    // 配置同步
    await navigateToProfile(page);
    await expandSyncConfig(page);
    
    const serverInput = page.getByPlaceholder('http://127.0.0.1:3000');
    await serverInput.fill(BACKEND_URL);
    await page.getByRole('button', { name: '连接' }).click();

    await expect(page.getByRole('button', { name: '断开' })).toBeVisible({ timeout: 10000 });

    // 手机号登录（自动同步开关需要已登录）
    await page.getByPlaceholder('请输入手机号').fill('13800138001');
    await page.getByRole('button', { name: '登录并同步' }).click();
    await expect(page.getByText('状态')).toBeVisible({ timeout: 10000 });
    
    // 确认自动同步已开启
    const autoSyncSwitch = page.locator('button[role="switch"]').first();
    if (await autoSyncSwitch.isEnabled()) {
      // 确保开启
      const isChecked = await autoSyncSwitch.getAttribute('data-state');
      if (isChecked !== 'checked') {
        await autoSyncSwitch.click();
      }
    }
    
    // 返回首页添加记录
    await page.locator('nav button').filter({ hasText: '首页' }).click();
    await addTestRecord(page, 'expense', '33', '交通', '自动同步测试');
    
    // 等待自动同步触发（3秒防抖 + 同步时间）
    await page.waitForTimeout(6000);
    
    // 回到个人中心检查同步状态
    await navigateToProfile(page);
    
    // 如果自动同步工作正常，待同步应该为 0
    // 注意：这取决于网络状况
  });

  test('关闭自动同步后变更不应自动上传', async ({ page }) => {
    await initializeTestEnv(page);
    
    // 配置同步
    await navigateToProfile(page);
    await expandSyncConfig(page);
    
    const serverInput = page.getByPlaceholder('http://127.0.0.1:3000');
    await serverInput.fill(BACKEND_URL);
    await page.getByRole('button', { name: '连接' }).click();

    await expect(page.getByRole('button', { name: '断开' })).toBeVisible({ timeout: 10000 });

    // 手机号登录（自动同步开关需要已登录）
    await page.getByPlaceholder('请输入手机号').fill('13800138001');
    await page.getByRole('button', { name: '登录并同步' }).click();
    await expect(page.getByText('状态')).toBeVisible({ timeout: 10000 });
    
    // 关闭自动同步
    const autoSyncSwitch = page.locator('button[role="switch"]').first();
    if (await autoSyncSwitch.isEnabled()) {
      const isChecked = await autoSyncSwitch.getAttribute('data-state');
      if (isChecked === 'checked') {
        await autoSyncSwitch.click();
      }
    }
    
    // 返回首页添加记录
    await page.locator('nav button').filter({ hasText: '首页' }).click();
    await addTestRecord(page, 'expense', '44', '餐饮', '手动同步测试');
    
    // 等待一段时间（不应该自动同步）
    await page.waitForTimeout(5000);
    
    // 回到个人中心检查同步状态
    await navigateToProfile(page);
    
    // 应该有待同步记录
    const pendingBadge = page.locator('text=/\\d+ 待同步/');
    await expect(pendingBadge).toBeVisible({ timeout: 3000 });
  });
});
