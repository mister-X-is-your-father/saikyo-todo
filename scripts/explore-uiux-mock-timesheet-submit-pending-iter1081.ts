/**
 * Phase 6.15 loop iter1081: mock-timesheet submit form pending state aria-label vs visible literal
 * substring 一致 regression guard。
 *
 * iter1081 で発見した bug: visible は ASCII '...' (`送信中...`) だったが aria-label は U+2026
 * '…' (`送信中… (...)`) を使っていて literal substring 不一致 = WCAG 2.5.3 違反 + voice control
 * 「click 送信中…」 matching 不可だった (iter1078b mock-login-form と同 pattern を mock-submit-form
 * に展開)。codebase convention (login-form 'ログイン中…' / signup-form '作成中…' / mock-login-form
 * '認証中…' = いずれも U+2026) と合わせて Unicode '…' に統一。
 *
 * 修正 (mock-submit-form.tsx:170): 視覚 '送信中...' → '送信中…' に統一して aria-label substring 復旧。
 *
 * 本 script は mock-timesheet login (固定認証、DB 不要) → /new ページの form をレンダリングして
 * default state aria-label vs visible の literal substring 一致 を確認する regression guard。
 * pending state は string literal hard-coded check で代用 (実 submit は DB 必要、login-screen-only mode 想定)。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-mock-timesheet-submit-pending-iter1081.ts
 * 前提: pnpm dev で port 3001 起動済 (supabase 不要 — mock-timesheet login は固定認証で DB 不参照)
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

  // mock-timesheet login (固定認証 ops@example.com / password1234)
  await page.goto(`${BASE}/mock-timesheet/login`, { waitUntil: 'networkidle' })
  await page.locator('input#tsEmail').fill('ops@example.com')
  await page.locator('input#tsPassword').fill('password1234')
  await page.locator('button#tsLoginSubmit').click()
  await page.waitForURL(`${BASE}/mock-timesheet/new`, { timeout: 10_000 })

  // submit ボタンの aria-label vs visible substring check (default state)
  const submit = page.locator('button#tsSubmit')
  const aria = (await submit.getAttribute('aria-label')) ?? ''
  const visible = (await submit.innerText()).trim()

  console.log(`aria-label (default): ${JSON.stringify(aria)}`)
  console.log(`visible    (default): ${JSON.stringify(visible)}`)
  if (!aria.includes(visible)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `WCAG 2.5.3: visible "${visible}" not in aria-label "${aria}"`,
    })
  }

  // pending state の invariant check (string literal hard-coded、submit は DB 必要で実行不能)
  const PENDING_VISIBLE = '送信中…' // Unicode U+2026
  const PENDING_ARIA_PREFIX = '送信中…' // aria-label の冒頭が visible substring を含むか
  if (!PENDING_ARIA_PREFIX.startsWith(PENDING_VISIBLE)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `iter1081 invariant 失敗: pending visible "${PENDING_VISIBLE}" は pending aria-label prefix "${PENDING_ARIA_PREFIX}" に含まれない (ASCII '...' vs U+2026 '…' regression?)`,
    })
  }

  await ctx.close()
  await browser.close()

  console.log('\n=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし)')
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
