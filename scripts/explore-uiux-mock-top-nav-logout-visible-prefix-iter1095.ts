/**
 * Phase 6.15 loop iter1095: mock-top-nav ログアウト button aria-label visible-prefix regression guard。
 *
 * iter1095 で発見した bug: 旧 aria-label "mock-timesheet session をログアウト" は visible
 * "ログアウト" を末尾に持つ → voice control prefix-matching で「click ログアウト」 match 不可。
 * iter1093/1094 visible-prefix sweep の convention に合わせ "ログアウト — mock-timesheet
 * session を終了" に統一。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-mock-top-nav-logout-visible-prefix-iter1095.ts
 * 前提: pnpm dev port 3001 起動済
 */
import { chromium } from '@playwright/test'

const BASE = 'http://localhost:3001'

interface Finding {
  level: 'error' | 'warning' | 'info'
  source: string
  message: string
}

async function main() {
  const findings: Finding[] = []
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()

  await page.goto(`${BASE}/mock-timesheet/login`, { waitUntil: 'networkidle' })
  await page.locator('input#tsEmail').fill('ops@example.com')
  await page.locator('input#tsPassword').fill('password1234')
  await page.locator('button#tsLoginSubmit').click()
  await page.waitForURL(`${BASE}/mock-timesheet/new`, { timeout: 10_000 })

  // ログアウト button (nav 内 type=submit、tsLoginSubmit と区別)
  const logout = page.locator('form button[type="submit"]').filter({ hasText: 'ログアウト' })
  const aria = (await logout.getAttribute('aria-label')) ?? ''
  const visible = (await logout.innerText()).trim()

  console.log(`aria-label: ${JSON.stringify(aria)}`)
  console.log(`visible: ${JSON.stringify(visible)}`)

  if (!aria.startsWith(visible)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `ログアウト button aria-label が visible "${visible}" で始まらない (現在: "${aria.slice(0, 30)}...")`,
    })
  }

  await ctx.close()
  await browser.close()

  console.log('\n=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — mock-top-nav ログアウト aria-label は visible-prefix 配置済')
  } else {
    for (const f of findings) console.log(`  [${f.level}/${f.source}] ${f.message}`)
  }
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
