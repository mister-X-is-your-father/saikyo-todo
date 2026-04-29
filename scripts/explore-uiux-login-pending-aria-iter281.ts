/**
 * Phase 6.15 loop iter 281 — /login submit button の pending 時 aria-label が
 * visible text を substring 含まない問題 (WCAG 2.5.3 Label in Name 違反)。
 *
 * 現状: visible="ログイン中…" / aria-label="ログイン処理中…" — "ログイン中…" は
 * "ログイン処理中…" の連続 substring ではない (中央に "処理" が挟まる)。
 * WCAG 2.5.3 Label in Name (Level A): "the name [accessible] contains the text
 * that is presented visually". 違反しているため、voice control / SR で
 * visible label を読み上げた際の不整合が生じる。
 *
 * /signup 側は visible="作成中…" / aria-label="アカウント作成中…" で
 * "作成中…" が "アカウント作成中…" の suffix substring として含まれており OK。
 * /login だけ非対称。
 *
 * 期待 (fix 後):
 *   /login pending 時: aria-label が visible text "ログイン中…" を substring 含む
 *   非 pending 時:    aria-label = null (iter276 維持)
 *
 * 完全 pending state を runtime で再現するには Supabase 認証 endpoint が必要
 * だが本環境は login-only mode のため到達不可。代替として:
 *   - 非 pending: runtime で aria-label=null を assert (iter276 invariant)
 *   - pending 時: source 側で regex assert (visible text "ログイン中…" を含む)
 *
 *   pnpm tsx scripts/explore-uiux-login-pending-aria-iter281.ts
 */
import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

const BASE = 'http://localhost:3001'

async function main(): Promise<void> {
  const findings: Finding[] = []

  // 1. source 側 assert: pending aria-label が visible text "ログイン中…" を substring 含むこと
  const src = readFileSync(resolve(process.cwd(), 'src/components/auth/login-form.tsx'), 'utf8')
  const m = src.match(/aria-label=\{isPending \? '([^']+)' : undefined\}/)
  const visibleText = 'ログイン中…'
  if (!m || m[1] === undefined) {
    findings.push({
      level: 'warning',
      message: `login-form.tsx: pending aria-label の三項式が見つからない`,
    })
  } else {
    const ariaWhenPending: string = m[1]
    findings.push({
      level: 'info',
      message: `pending aria-label="${ariaWhenPending}" / visible="${visibleText}"`,
    })
    if (!ariaWhenPending.includes(visibleText)) {
      findings.push({
        level: 'warning',
        message: `WCAG 2.5.3 違反: aria-label "${ariaWhenPending}" が visible text "${visibleText}" を連続 substring として含まない`,
      })
    }
  }

  // 2. runtime assert: 非 pending 時 aria-label=null (iter276 invariant)
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await context.newPage()
  page.on('pageerror', (e) => {
    findings.push({ level: 'error', message: `pageerror: ${e.message}`.slice(0, 240) })
  })
  try {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
    const submit = page.locator('form button[type="submit"]').first()
    const aria = await submit.getAttribute('aria-label')
    const text = (await submit.textContent())?.trim()
    findings.push({
      level: 'info',
      message: `/login (非 pending): submit aria-label=${JSON.stringify(aria)} text=${JSON.stringify(text)}`,
    })
    if (aria !== null) {
      findings.push({
        level: 'warning',
        message: `/login 非 pending 時 aria-label="${aria}" — null 期待 (iter276 invariant)`,
      })
    }
  } finally {
    await context.close().catch(() => {})
    await browser.close().catch(() => {})
  }

  console.log(`\n=== Findings (login-pending-aria-iter281) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
