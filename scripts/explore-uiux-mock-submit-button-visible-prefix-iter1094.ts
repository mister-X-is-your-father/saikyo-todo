/**
 * Phase 6.15 loop iter1094: mock-submit-form submit button default state の aria-label に
 * visible-prefix 配置 regression guard。
 *
 * iter1094 で発見した bug: mock-submit-form の submit button default aria-label "工数を送信 (...)"
 * は visible "送信" を "工数を**送信**" 位置 (middle) に持ち、voice control prefix-matching
 * で「click 送信」 match 不可。iter1093 signup-form / iter1034-1077 sweep convention に合わせ
 * visible 冒頭固定 ("送信 — 工数を送信 (...)")。pending state は既に "送信中…" prefix なので維持。
 *
 * 修正 (mock-submit-form.tsx): default aria-label に "送信 — " prefix を固定。
 *
 * 本 script は mock-login → /new で submit button の aria-label が visible "送信" で始まる
 * ことを assert + pending state hard-coded invariant。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-mock-submit-button-visible-prefix-iter1094.ts
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

  const submit = page.locator('button#tsSubmit')
  const aria = (await submit.getAttribute('aria-label')) ?? ''
  const visible = (await submit.innerText()).trim()

  console.log(`aria-label (default): ${JSON.stringify(aria)}`)
  console.log(`visible    (default): ${JSON.stringify(visible)}`)

  if (!aria.startsWith(visible)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `mock-submit button aria-label が visible "${visible}" で始まらない (現在の冒頭: "${aria.slice(0, 30)}...")`,
    })
  }

  // pending state は string literal hard-coded check
  const PENDING_VISIBLE = '送信中…'
  const PENDING_ARIA_PREFIX = '送信中… (mock-timesheet 工数送信処理を実行中)'
  if (!PENDING_ARIA_PREFIX.startsWith(PENDING_VISIBLE)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `iter1094 invariant 失敗: pending visible "${PENDING_VISIBLE}" が pending aria-label "${PENDING_ARIA_PREFIX}" で始まらない`,
    })
  }

  await ctx.close()
  await browser.close()

  console.log('\n=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — mock-submit button aria-label は visible-prefix 配置済')
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
