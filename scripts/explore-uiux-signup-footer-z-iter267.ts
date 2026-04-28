/**
 * Phase 6.15 loop iter 267 — signup CardFooter の z-index 整合 探索。
 *
 * iter4 で /login の CardFooter に `relative z-10` を付けて Link が dev
 * overlay (Next.js HMR / devtools) や stacking context で隠れないように
 * したが、/signup CardFooter は対応無し。signup → login link が同条件で
 * 押せない可能性がある (Playwright `force:true` が必要になるパターン)。
 *
 * 期待 (fix 後):
 *   /signup CardFooter にも `relative z-10` クラス、ログイン Link が
 *   click 可能 (force:false で .click() 成功)。
 *
 * 検証ロジック: signup を開いて footer link を `force: false` で click し
 * /login へ遷移できるか確認。Supabase 不要。
 *
 *   pnpm tsx scripts/explore-uiux-signup-footer-z-iter267.ts
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

  try {
    await page.goto(`${BASE}/signup`, { waitUntil: 'networkidle' })

    // CardFooter の class を確認 (relative z-10 が含まれるか)
    const footerClass = await page
      .locator('[data-slot="card-footer"]')
      .first()
      .getAttribute('class')
    findings.push({ level: 'info', message: `/signup: CardFooter class=${footerClass}` })
    if (!footerClass?.includes('relative') || !footerClass?.includes('z-10')) {
      findings.push({
        level: 'warning',
        message: `/signup: CardFooter に relative + z-10 不在 (login と非整合) — 同 stacking context 問題のリスク`,
      })
    }

    // login link を force:false で click して遷移できるか
    try {
      await page.locator('a[href="/login"]').first().click({ trial: true, timeout: 2000 })
      findings.push({
        level: 'info',
        message: `/signup: login link click(trial) OK (hit-test 成功)`,
      })
    } catch (e) {
      findings.push({
        level: 'warning',
        message: `/signup: login link click(trial) 失敗 — ${(e as Error).message.slice(0, 120)}`,
      })
    }
  } finally {
    await context.close().catch(() => {})
    await browser.close().catch(() => {})
  }

  console.log(`\n=== Findings (signup-footer-z-iter267) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
