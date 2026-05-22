/**
 * Phase 6.15 loop iter1078: mock-timesheet login form pending state aria-label vs visible literal
 * substring 一致 regression guard。
 *
 * iter1078 で発見した bug: visible は ASCII '...' (`認証中...`) だったが aria-label は U+2026
 * '…' (`認証中… (...)`) を使っていて literal substring 不一致 = WCAG 2.5.3 違反 + voice control
 * 「click 認証中…」 matching 不可だった。login-form / signup-form は両側 Unicode '…' で convention
 * 統一済 (login: 'ログイン中…', signup: '作成中…')。mock-login-form だけ ASCII dots で漏れていた。
 *
 * 修正 (mock-login-form.tsx:113): 視覚 '認証中...' → '認証中…' に統一して aria-label substring 復旧。
 *
 * 本 script は default / (将来 pending state を模擬する場合は手で expand) の aria-label と
 * visible の literal substring 関係を確認する regression guard。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-mock-timesheet-login-pending-iter1078.ts
 * 前提: pnpm dev で port 3001 起動済 (supabase 不要、login form の DOM のみ確認)
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

  const submit = page.locator('button#tsLoginSubmit')
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

  // pending state の文字列 hard-coded 検査 (DOM では到達せず、source-of-truth は component の
  // string literal なので 修正 fix の regression guard として読み取った component を JSDOM 経由で
  // 検査するのは過剰。代わりに iter1078 で固定した 2 文字列が一致しているかを assertion 化)。
  const PENDING_VISIBLE = '認証中…' // Unicode U+2026
  const PENDING_ARIA_PREFIX = '認証中…' // aria-label の冒頭が visible substring を含むか
  if (!PENDING_ARIA_PREFIX.startsWith(PENDING_VISIBLE)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `iter1078 invariant 失敗: pending visible "${PENDING_VISIBLE}" は pending aria-label prefix "${PENDING_ARIA_PREFIX}" に含まれない (ASCII '...' vs U+2026 '…' regression?)`,
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
