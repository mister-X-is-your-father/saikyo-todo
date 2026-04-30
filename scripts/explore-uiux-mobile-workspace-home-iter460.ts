/**
 * Phase 6.15 loop iter 460 (mode-M Mobile audit) — workspace home (/<wsId>)
 * を iPhone SE (375x667) で audit。dev seed user (dev@example.com / dev12345)
 * + workspace 00000000-0000-0000-0000-00000000000a を活用。
 *
 * 観点:
 *   1. login → workspace home へ遷移
 *   2. documentElement.scrollWidth ≤ 375 (横スクロールなし)
 *   3. nav button 群が 44x44 以上
 *   4. screenshot 保存
 */
import { chromium, devices } from '@playwright/test'

const BASE = 'http://localhost:3001'
const DEV_EMAIL = 'dev@example.com'
const DEV_PASS = 'dev12345'
const DEV_WS_ID = '00000000-0000-0000-0000-00000000000a'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const browser = await chromium.launch({ headless: true })
  try {
    const context = await browser.newContext({
      ...devices['iPhone SE'],
      hasTouch: true,
      isMobile: true,
    })
    const page = await context.newPage()

    // 1. login
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 30_000 })
    await page.locator('input#email').fill(DEV_EMAIL)
    await page.locator('input#password').fill(DEV_PASS)
    await page.locator('button[type="submit"]').tap()
    // login redirects to /
    await page.waitForURL(`${BASE}/`, { timeout: 15_000 })

    // 2. workspace home
    await page.goto(`${BASE}/${DEV_WS_ID}`, { waitUntil: 'networkidle', timeout: 30_000 })

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    if (scrollWidth > 375) {
      findings.push({
        level: 'warning',
        message: `scrollWidth=${scrollWidth}px > 375px`,
      })
    } else {
      findings.push({
        level: 'info',
        message: `scrollWidth=${scrollWidth}px ≤ 375px OK`,
      })
    }

    // 3. nav buttons (Goals / Sprints / PDCA / Templates / Workflows / API 連携 / Time Entries / Archive / 一覧)
    const navButtons = await page
      .locator('nav[aria-label="ワークスペース内ナビゲーション"] a')
      .all()
    let totalChecked = 0
    let total44 = 0
    for (const btn of navButtons) {
      const box = await btn.boundingBox()
      if (!box) continue
      totalChecked++
      if (box.height >= 44 && box.width >= 44) total44++
    }
    findings.push({
      level: total44 === totalChecked ? 'info' : 'warning',
      message: `nav button: ${total44}/${totalChecked} pass 44x44`,
    })

    // 4. screenshot
    await page.screenshot({
      path: '/tmp/uiux-mobile-workspace-home-iter460.png',
      fullPage: true,
    })
    findings.push({ level: 'info', message: 'screenshot saved' })

    await context.close()
  } finally {
    await browser.close().catch(() => {})
  }

  console.log(`\n=== Findings (mobile-workspace-home-iter460) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
