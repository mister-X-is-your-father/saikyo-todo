/**
 * Phase 6.15 loop iter 464 (mode-M Mobile audit) — /sprints page で各 sprint
 * card の action button (status select / period 編集 / Retro / Pre-mortem 等)
 * を iPhone SE で audit。default seed には sprint 0 件なので、本 iter は
 * sprint 作成 form の field button + back button のみ。
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

    await page.goto(`${BASE}/${DEV_WS_ID}/sprints`, { waitUntil: 'networkidle', timeout: 30_000 })

    // sprint 作成 form の作成 button を audit (data-testid="create-sprint-btn")
    const submitBox = await page
      .locator('button[type="submit"]')
      .first()
      .boundingBox()
      .catch(() => null)
    if (submitBox) {
      if (submitBox.height < 44 || submitBox.width < 44) {
        findings.push({
          level: 'warning',
          message: `sprint 作成 button: ${submitBox.width.toFixed(0)}x${submitBox.height.toFixed(0)} < 44x44`,
        })
      } else {
        findings.push({
          level: 'info',
          message: `sprint 作成 button: ${submitBox.width.toFixed(0)}x${submitBox.height.toFixed(0)} OK`,
        })
      }
    }

    // back button (← Workspace)
    const backBox = await page
      .locator('a[href$="/' + DEV_WS_ID + '"]')
      .first()
      .boundingBox()
      .catch(() => null)
    if (backBox) {
      if (backBox.height < 44 || backBox.width < 44) {
        findings.push({
          level: 'warning',
          message: `← Workspace: ${backBox.width.toFixed(0)}x${backBox.height.toFixed(0)} < 44x44`,
        })
      } else {
        findings.push({
          level: 'info',
          message: `← Workspace: ${backBox.width.toFixed(0)}x${backBox.height.toFixed(0)} OK (iter461 fix)`,
        })
      }
    }

    // utility buttons (NotificationBell / NotificationPreferences / ThemeToggle)
    for (const t of [
      { selector: 'button[data-testid="notification-bell"]', label: 'NotificationBell' },
      { selector: 'button[data-testid="theme-toggle"]', label: 'ThemeToggle' },
    ]) {
      const box = await page
        .locator(t.selector)
        .first()
        .boundingBox()
        .catch(() => null)
      if (box) {
        if (box.height < 44 || box.width < 44) {
          findings.push({
            level: 'warning',
            message: `${t.label}: ${box.width.toFixed(0)}x${box.height.toFixed(0)} < 44x44`,
          })
        } else {
          findings.push({
            level: 'info',
            message: `${t.label}: ${box.width.toFixed(0)}x${box.height.toFixed(0)} OK (iter462 fix)`,
          })
        }
      }
    }

    await page.screenshot({
      path: '/tmp/uiux-mobile-sprints-iter464.png',
      fullPage: true,
    })

    await context.close()
  } finally {
    await browser.close().catch(() => {})
  }

  console.log(`\n=== Findings (mobile-sprints-page-iter464) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
