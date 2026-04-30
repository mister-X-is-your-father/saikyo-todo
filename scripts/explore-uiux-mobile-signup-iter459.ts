/**
 * Phase 6.15 loop iter 459 (mode-M Mobile audit) — /signup page を iPhone SE
 * (375x667) で audit、tap target / overflow / 視覚 layout を確認。iter458 と同
 * pattern で /login 完了後の signup 側 mirror 検証。
 */
import { chromium, devices } from '@playwright/test'

const BASE = 'http://localhost:3001'

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
    await page.goto(`${BASE}/signup`, { waitUntil: 'networkidle', timeout: 30_000 })

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    if (scrollWidth > 375) {
      findings.push({
        level: 'warning',
        message: `documentElement.scrollWidth=${scrollWidth}px > 375px (横スクロール発生)`,
      })
    } else {
      findings.push({
        level: 'info',
        message: `documentElement.scrollWidth=${scrollWidth}px ≤ 375px OK`,
      })
    }

    const submitBox = await page.locator('button[type="submit"]').first().boundingBox()
    if (submitBox) {
      if (submitBox.height < 44 || submitBox.width < 44) {
        findings.push({
          level: 'warning',
          message: `submit button: ${submitBox.width.toFixed(0)}x${submitBox.height.toFixed(0)} < 44x44`,
        })
      } else {
        findings.push({
          level: 'info',
          message: `submit button: ${submitBox.width.toFixed(0)}x${submitBox.height.toFixed(0)} OK`,
        })
      }
    }

    // login link tap target
    const loginLinkBox = await page
      .locator('a[href="/login"]')
      .first()
      .boundingBox()
      .catch(() => null)
    if (loginLinkBox) {
      if (loginLinkBox.height < 44 || loginLinkBox.width < 44) {
        findings.push({
          level: 'warning',
          message: `login link: ${loginLinkBox.width.toFixed(0)}x${loginLinkBox.height.toFixed(0)} < 44x44`,
        })
      } else {
        findings.push({
          level: 'info',
          message: `login link: ${loginLinkBox.width.toFixed(0)}x${loginLinkBox.height.toFixed(0)} OK`,
        })
      }
    } else {
      findings.push({
        level: 'info',
        message: `login link が見つからない (構造変化?)`,
      })
    }

    await page.screenshot({
      path: '/tmp/uiux-mobile-signup-iter459.png',
      fullPage: true,
    })
    findings.push({
      level: 'info',
      message: 'screenshot saved /tmp/uiux-mobile-signup-iter459.png',
    })

    await context.close()
  } finally {
    await browser.close().catch(() => {})
  }

  console.log(`\n=== Findings (mobile-signup-iter459) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
