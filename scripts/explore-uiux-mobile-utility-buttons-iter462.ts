/**
 * Phase 6.15 loop iter 462 (mode-M Mobile audit) — workspace home の utility
 * button 群 (NotificationBell / NotificationPreferencesButton / ThemeToggle /
 * HeartbeatButton) を iPhone SE で audit。size="icon" はそれぞれ 36px /
 * size="sm" の HeartbeatButton も 32px と推定、44x44 違反の可能性あり。
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

    const TARGETS: { selector: string; label: string }[] = [
      { selector: 'button[data-testid="heartbeat-btn"]', label: 'HeartbeatButton' },
      { selector: 'button[data-testid="notification-bell"]', label: 'NotificationBell' },
      {
        selector: 'button[data-testid="notification-preferences"]',
        label: 'NotificationPreferences',
      },
      { selector: 'button[data-testid="theme-toggle"]', label: 'ThemeToggle' },
    ]
    for (const t of TARGETS) {
      const box = await page
        .locator(t.selector)
        .first()
        .boundingBox()
        .catch(() => null)
      if (!box) {
        findings.push({ level: 'info', message: `${t.label}: not visible (skip)` })
        continue
      }
      if (box.height < 44 || box.width < 44) {
        findings.push({
          level: 'warning',
          message: `${t.label}: ${box.width.toFixed(0)}x${box.height.toFixed(0)} < 44x44`,
        })
      } else {
        findings.push({
          level: 'info',
          message: `${t.label}: ${box.width.toFixed(0)}x${box.height.toFixed(0)} OK`,
        })
      }
    }

    await page.screenshot({
      path: '/tmp/uiux-mobile-utility-iter462.png',
      fullPage: true,
    })
    findings.push({ level: 'info', message: 'screenshot saved' })

    await context.close()
  } finally {
    await browser.close().catch(() => {})
  }

  console.log(`\n=== Findings (mobile-utility-buttons-iter462) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
