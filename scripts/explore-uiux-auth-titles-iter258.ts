/**
 * Phase 6.15 loop iter 258 — login / signup / ~offline の <title> a11y/UX 探索。
 *
 * iter255-257 で auth ページの form a11y / heading / Card region / mobile
 * input attr は固めたが、ブラウザタブの `document.title` が全部 "最強TODO"
 * のまま。複数タブを開いたユーザは tab strip 上で「どれが login でどれが
 * signup か」見分けられない、SR ユーザは window 切替時の announce が常に
 * 同じになる。
 *
 * 期待 (fix 後):
 *   - /login    : "ログイン | 最強TODO"
 *   - /signup   : "サインアップ | 最強TODO"
 *   - /~offline : "オフライン | 最強TODO"
 *
 * Supabase 不要。
 *
 *   pnpm tsx scripts/explore-uiux-auth-titles-iter258.ts
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

  async function audit(path: string, expected: string) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
    const title = await page.title()
    findings.push({ level: 'info', message: `${path}: title=${JSON.stringify(title)}` })
    if (title !== expected) {
      findings.push({
        level: 'warning',
        message: `${path}: title 期待=${JSON.stringify(expected)} 実際=${JSON.stringify(title)} — tab で他ページと見分け不可 / SR window 切替で同じ announce`,
      })
    }
  }

  try {
    await audit('/login', 'ログイン | 最強TODO')
    await audit('/signup', 'サインアップ | 最強TODO')
    await audit('/~offline', 'オフライン | 最強TODO')
  } finally {
    await context.close().catch(() => {})
    await browser.close().catch(() => {})
  }

  console.log(`\n=== Findings (auth-titles-iter258) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
