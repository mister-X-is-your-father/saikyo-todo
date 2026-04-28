/**
 * Phase 6.15 loop iter 280 — login/signup password input の enterKeyHint 探索。
 *
 * 現状: 各 password input (form 最終 field) に `enterKeyHint` 指定無し。
 * mobile キーボードの Enter ボタンは default "改行" or "次" のような
 * generic ラベル。`enterKeyHint="send"` を指定すると iOS / Android の
 * 仮想キーボードが Enter ボタンを「送信」/「Send」として表示し、ユーザに
 * 「ここで Enter すれば form 送信」と明示できる。
 *
 * 期待 (fix 後):
 *   /login   password input: enterKeyHint="send"
 *   /signup  password input: enterKeyHint="send"
 *
 * Supabase 不要。
 *
 *   pnpm tsx scripts/explore-uiux-auth-enterkeyhint-iter280.ts
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
    const pw = page.locator('input#password')
    const hint = await pw.getAttribute('enterkeyhint')
    findings.push({
      level: 'info',
      message: `${path}: password enterkeyhint=${hint}`,
    })
    if (hint !== 'send') {
      findings.push({
        level: 'warning',
        message: `${path}: password に enterKeyHint="send" 不在 (現値=${hint}) — mobile キーボード Enter キーラベルが generic、submit 意図が伝わりにくい`,
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

  console.log(`\n=== Findings (auth-enterkeyhint-iter280) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
