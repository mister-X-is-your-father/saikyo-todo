/**
 * Phase 6.15 loop iter 290 — /login と /signup の email input が `autoCorrect`
 * 指定無し → iOS Safari の default が "on"、ユーザーが email を typing 中に
 * 単語が auto-correct で書き換えられて誤メールアドレスを送信するリスク。
 *
 * 現状: email input は spellCheck=false / autoCapitalize="none" / inputMode="email"
 * は指定済みだが autoCorrect 未指定。iOS では type="email" でも autoCorrect="on"
 * が default で適用される (browser dependent)。
 *
 * iOS の典型 issue:
 *   "foo@example.com" と打つと "foo@example.con" の様に最後の "com" が "con"
 *   に "修正" されたり、ユーザ名部分が辞書に近い単語に変えられる。
 *
 * 期待 (fix 後):
 *   email input に `autoCorrect="off"` を追加。iOS / Safari で auto-correct
 *   無効化。spellCheck と autoCapitalize と並んで email 入力の三点セットが
 *   揃う (HTML spec: autocorrect は WHATWG 拡張、Safari/iOS 主要)。
 *
 * Supabase 不要。
 *
 *   pnpm tsx scripts/explore-uiux-auth-email-autocorrect-iter290.ts
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

  async function audit(path: string) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
    const ac = await page.locator('input#email').first().getAttribute('autocorrect')
    findings.push({
      level: 'info',
      message: `${path}: input#email autocorrect=${JSON.stringify(ac)}`,
    })
    if (ac !== 'off') {
      findings.push({
        level: 'warning',
        message: `${path}: input#email に autocorrect="off" が無い (iOS で auto-correct ON)`,
      })
    }
  }

  try {
    await audit('/login')
    await audit('/signup')
  } finally {
    await context.close().catch(() => {})
    await browser.close().catch(() => {})
  }

  console.log(`\n=== Findings (auth-email-autocorrect-iter290) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
