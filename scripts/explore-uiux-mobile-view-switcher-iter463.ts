/**
 * Phase 6.15 loop iter 463 (mode-M Mobile audit) — items-board view-switcher の
 * 9 view button (Today / Inbox / Kanban / Backlog / Gantt / Dashboard / 日次 /
 * 週次 / 月次) を iPhone SE で audit、tap target 44x44 確認。
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

    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 30_000 })
    await page.locator('input#email').fill(DEV_EMAIL)
    await page.locator('input#password').fill(DEV_PASS)
    await page.locator('button[type="submit"]').tap()
    await page.waitForURL(`${BASE}/`, { timeout: 15_000 })

    await page.goto(`${BASE}/${DEV_WS_ID}`, { waitUntil: 'networkidle', timeout: 30_000 })

    const VIEWS = [
      'today',
      'inbox',
      'kanban',
      'backlog',
      'gantt',
      'dashboard',
      'daily',
      'weekly',
      'monthly',
    ]
    let total44 = 0
    for (const v of VIEWS) {
      const box = await page
        .locator(`button[data-testid="view-${v}-btn"]`)
        .first()
        .boundingBox()
        .catch(() => null)
      if (!box) {
        findings.push({ level: 'info', message: `view-${v}: not visible` })
        continue
      }
      if (box.height < 44 || box.width < 44) {
        findings.push({
          level: 'warning',
          message: `view-${v}: ${box.width.toFixed(0)}x${box.height.toFixed(0)} < 44x44`,
        })
      } else {
        total44++
        findings.push({
          level: 'info',
          message: `view-${v}: ${box.width.toFixed(0)}x${box.height.toFixed(0)} OK`,
        })
      }
    }
    findings.push({
      level: total44 === VIEWS.length ? 'info' : 'warning',
      message: `view-switcher 累計 ${total44}/${VIEWS.length} pass`,
    })

    await page.screenshot({
      path: '/tmp/uiux-mobile-view-switcher-iter463.png',
      fullPage: true,
    })

    await context.close()
  } finally {
    await browser.close().catch(() => {})
  }

  console.log(`\n=== Findings (mobile-view-switcher-iter463) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
