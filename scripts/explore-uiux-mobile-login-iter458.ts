/**
 * Phase 6.15 loop iter 458 (mode-M Mobile audit) — /login page を iPhone SE
 * (375x667) で audit、tap target / overflow / 視覚 layout の screenshot を保存。
 *
 * 目的: iter417-457 で a11y/UX gap がほぼ枯渇したため、runtime audit で
 * 既存実装の視覚 quality を確認する。/login は seed 不要で確実に走る。
 *
 * 観点 (CLAUDE.md mode-M):
 *   1. documentElement.scrollWidth が viewport (375px) を超えないか
 *   2. submit button が 44x44 以上か (iter409 で h-11 に設定済)
 *   3. signup link が 44x44 以上か (iter412 で min-h-11 に設定済)
 *   4. screenshot 保存 (/tmp/uiux-mobile-login-iter458.png)
 *
 * 修正の狙い: 問題があれば fix を含める、無ければ「探索のみ」 として HANDOFF
 * §9 に記録。
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
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 30_000 })

    // 1. document scrollWidth ≤ 375
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

    // 2. submit button tap target
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

    // 3. signup link tap target
    const linkBox = await page
      .locator('a[href="/signup"], a[href*="signup"]')
      .first()
      .boundingBox()
      .catch(() => null)
    if (linkBox) {
      if (linkBox.height < 44 || linkBox.width < 44) {
        findings.push({
          level: 'warning',
          message: `signup link: ${linkBox.width.toFixed(0)}x${linkBox.height.toFixed(0)} < 44x44`,
        })
      } else {
        findings.push({
          level: 'info',
          message: `signup link: ${linkBox.width.toFixed(0)}x${linkBox.height.toFixed(0)} OK`,
        })
      }
    } else {
      findings.push({
        level: 'info',
        message: `signup link が見つからない (iter412 fix 後の構造変化?)`,
      })
    }

    // 4. screenshot
    await page.screenshot({
      path: '/tmp/uiux-mobile-login-iter458.png',
      fullPage: true,
    })
    findings.push({ level: 'info', message: 'screenshot saved /tmp/uiux-mobile-login-iter458.png' })

    await context.close()
  } finally {
    await browser.close().catch(() => {})
  }

  console.log(`\n=== Findings (mobile-login-iter458) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
