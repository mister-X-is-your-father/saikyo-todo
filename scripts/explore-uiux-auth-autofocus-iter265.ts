/**
 * Phase 6.15 loop iter 265 — login / signup の最初の入力 field に autoFocus 探索。
 *
 * 現状: /login と /signup を開くとカーソルが何処にも入らず、ユーザは Tab を
 * 数回押す or マウスクリックで最初の field に着地する必要がある (login: email
 * 1 Tab、signup: displayName 1 Tab)。auth ページは「即入力したい」ユーザの
 * 中心 use case なので、初期 focus が無いのは UX の取りこぼし。
 *
 * 期待 (fix 後):
 *   /login   : 最初に focus 状態の input が email
 *   /signup  : 最初に focus 状態の input が displayName
 *
 * 注意: autoFocus は SR で「読み上げ中の context を割り込む」批判もあるが、
 * auth ページは画面遷移直後の「明確な意図」(=login する) があり、focus
 * 期待が Conventional な画面 (Twitter login / GitHub login 等が同様) なので
 * 許容。heading + description は Card region の aria-labelledby /
 * aria-describedby (iter257 / iter261) で region 入境時に announce 済。
 *
 * Supabase 不要。
 *
 *   pnpm tsx scripts/explore-uiux-auth-autofocus-iter265.ts
 */
import { chromium } from '@playwright/test'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

const BASE = 'http://localhost:3001'

async function main(): Promise<void> {
  const findings: Finding[] = []
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await context.newPage()

  page.on('pageerror', (e) => {
    findings.push({ level: 'error', message: `pageerror: ${e.message}`.slice(0, 240) })
  })

  async function audit(path: string, expectedFocusedId: string) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
    // 描画直後 React の autoFocus が効いているか確認
    await page.waitForTimeout(200)
    const focusedId = await page.evaluate(() => document.activeElement?.id ?? null)
    findings.push({ level: 'info', message: `${path}: document.activeElement.id=${focusedId}` })
    if (focusedId !== expectedFocusedId) {
      findings.push({
        level: 'warning',
        message: `${path}: 初期 focus が "${expectedFocusedId}" 期待だが "${focusedId}" — 即入力 use case の取りこぼし`,
      })
    }
  }

  try {
    await audit('/login', 'email')
    await audit('/signup', 'displayName')
  } finally {
    await context.close().catch(() => {})
    await browser.close().catch(() => {})
  }

  console.log(`\n=== Findings (auth-autofocus-iter265) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
