import { chromium } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'

const BASE_URL = 'http://127.0.0.1:5173'
const OUTPUT_DIR = path.join(__dirname, '../screenshots')

// 模拟移动端尺寸 (iPhone 14 Pro)
const VIEWPORT = { width: 393, height: 852 }

async function main() {
  // 确保输出目录存在
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
  })

  const page = await context.newPage()
  
  console.log('正在初始化数据...')
  await page.goto(BASE_URL, { waitUntil: 'load', timeout: 30000 })
  await page.waitForTimeout(1000)
  
  // 设置初始数据
  await page.evaluate(() => {
    const now = new Date().toISOString()
    const today = now.split('T')[0]
    const ledgerId = 'demo-ledger-001'
    
    // 用户配置
    localStorage.setItem('pa_user_profile', JSON.stringify({
      id: 'demo-user-001',
      nickname: '演示用户',
      currentLedgerId: ledgerId,
      createdAt: now,
      updatedAt: now,
      phone: '13800138000',
      serverUrl: 'http://127.0.0.1:3000',
    }))

    // 账本
    localStorage.setItem('pa_ledgers', JSON.stringify([
      { id: ledgerId, name: '日常账本', icon: '📒', color: '#3B82F6', createdAt: now, updatedAt: now },
      { id: 'ledger-2', name: '旅行基金', icon: '✈️', color: '#10B981', createdAt: now, updatedAt: now },
    ]))

    // 生成多条示例记录
    const records = [
      { id: 'r1', type: 'expense', amount: 35.5, category: 'food', date: today, note: '午餐外卖', ledgerId, createdAt: now, updatedAt: now, syncStatus: 'pending' },
      { id: 'r2', type: 'expense', amount: 128, category: 'shopping', date: today, note: '日用品采购', ledgerId, createdAt: now, updatedAt: now, syncStatus: 'synced' },
      { id: 'r3', type: 'income', amount: 15000, category: 'salary', date: today, note: '12月工资', ledgerId, createdAt: now, updatedAt: now, syncStatus: 'synced' },
      { id: 'r4', type: 'expense', amount: 6.5, category: 'transport', date: today, note: '地铁通勤', ledgerId, createdAt: now, updatedAt: now, syncStatus: 'pending' },
      { id: 'r5', type: 'expense', amount: 299, category: 'entertainment', date: today, note: '电影票', ledgerId, createdAt: now, updatedAt: now, syncStatus: 'synced' },
      { id: 'r6', type: 'expense', amount: 2500, category: 'housing', date: today, note: '房租', ledgerId, createdAt: now, updatedAt: now, syncStatus: 'synced' },
      { id: 'r7', type: 'income', amount: 3000, category: 'bonus', date: today, note: '年终奖', ledgerId, createdAt: now, updatedAt: now, syncStatus: 'synced' },
      { id: 'r8', type: 'expense', amount: 45, category: 'food', date: today, note: '晚餐', ledgerId, createdAt: now, updatedAt: now, syncStatus: 'pending' },
    ]
    localStorage.setItem('pa_records', JSON.stringify(records))
  })

  // 刷新页面让数据生效
  console.log('刷新页面加载数据...')
  await page.reload({ waitUntil: 'load' })
  await page.waitForTimeout(2000)
  
  console.log('\n开始截图...\n')

  // 辅助函数：点击底部导航
  const clickNav = async (label: string) => {
    console.log(`   点击导航: ${label}`)
    await page.click(`nav button:has(span:text("${label}"))`)
    await page.waitForTimeout(800)
  }

  // 辅助函数：点击左上角返回按钮
  const clickBack = async () => {
    console.log('   点击返回按钮')
    // Header 组件中的返回按钮包含 ChevronLeft 图标
    await page.click('header button')
    await page.waitForTimeout(800)
  }

  // 1. 首页截图
  console.log('📸 01-首页')
  await page.screenshot({ path: path.join(OUTPUT_DIR, '01-home.png'), fullPage: false })
  console.log('   ✅ 保存完成\n')

  // 2. 点击"记收入"按钮（在首页的快捷操作区域）
  console.log('📸 02-记账(收入)')
  await page.click('button:has-text("记收入")')
  await page.waitForTimeout(800)
  await page.screenshot({ path: path.join(OUTPUT_DIR, '02-record-income.png'), fullPage: false })
  console.log('   ✅ 保存完成\n')

  // 返回首页 - 点击左上角返回按钮
  await clickBack()

  // 3. 点击"记支出"按钮
  console.log('📸 03-记账(支出)')
  await page.click('button:has-text("记支出")')
  await page.waitForTimeout(800)
  await page.screenshot({ path: path.join(OUTPUT_DIR, '03-record-expense.png'), fullPage: false })
  console.log('   ✅ 保存完成\n')

  // 返回首页 - 点击左上角返回按钮
  await clickBack()

  // 4. 点击底部导航"账单"
  console.log('📸 04-账单列表')
  await clickNav('账单')
  await page.screenshot({ path: path.join(OUTPUT_DIR, '04-records.png'), fullPage: false })
  console.log('   ✅ 保存完成\n')

  // 5. 账单页完整长截图
  console.log('📸 05-账单列表(长截图)')
  await page.screenshot({ path: path.join(OUTPUT_DIR, '05-records-full.png'), fullPage: true })
  console.log('   ✅ 保存完成\n')

  // 6. 切换到统计 Tab（如果有的话）
  console.log('📸 06-统计')
  const statsTab = page.locator('button:has-text("统计"), [role="tab"]:has-text("统计")')
  if (await statsTab.count() > 0) {
    await statsTab.first().click()
    await page.waitForTimeout(800)
  }
  await page.screenshot({ path: path.join(OUTPUT_DIR, '06-statistics.png'), fullPage: false })
  console.log('   ✅ 保存完成\n')

  // 7. 点击底部导航"我的"
  console.log('📸 07-我的')
  await clickNav('我的')
  await page.screenshot({ path: path.join(OUTPUT_DIR, '07-profile.png'), fullPage: false })
  console.log('   ✅ 保存完成\n')

  // 8. 我的页完整长截图
  console.log('📸 08-我的(长截图)')
  await page.screenshot({ path: path.join(OUTPUT_DIR, '08-profile-full.png'), fullPage: true })
  console.log('   ✅ 保存完成\n')

  await browser.close()
  
  console.log('=' .repeat(50))
  console.log('截图完成！所有图片保存在:', OUTPUT_DIR)
  
  // 列出所有截图
  const files = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.png')).sort()
  console.log(`\n共 ${files.length} 张截图:`)
  files.forEach(f => {
    const stats = fs.statSync(path.join(OUTPUT_DIR, f))
    console.log(`  - ${f} (${(stats.size / 1024).toFixed(1)} KB)`)
  })
  console.log('=' .repeat(50))
}

main().catch(err => {
  console.error('截图失败:', err)
  process.exit(1)
})
