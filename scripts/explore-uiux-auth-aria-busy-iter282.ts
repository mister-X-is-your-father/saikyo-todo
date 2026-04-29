/**
 * Phase 6.15 loop iter 282 — login/signup form の aria-busy="false" 不要 探索。
 *
 * 現状: 各 form に `aria-busy={isPending}` が設定されている。React は boolean
 * false を `aria-busy="false"` 属性として DOM に出力するため、非 pending 時
 * に常に `aria-busy="false"` が出ている。
 *
 * ARIA spec (4.6.2 aria-busy): default 状態は "false" で、属性自体が **不在**
 * が推奨。"false" 明示は SR ノイズ (実装によっては「busy ではない」を冗長に
 * announce する)。iter278 で aria-invalid を同 pattern で修正済み。
 *
 * 期待 (fix 後):
 *   `aria-busy={isPending || undefined}` (false の代わりに undefined → 属性削除)
 *   pending 時のみ `aria-busy="true"` が DOM に現れる。
 *
 * Supabase 不要 (login/signup 静的レンダリングで aria-busy を確認可能)。
 *
 *   pnpm tsx scripts/explore-uiux-auth-aria-busy-iter282.ts
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
    const ariaBusy = await page.locator('form').first().getAttribute('aria-busy')
    findings.push({
      level: 'info',
      message: `${path}: form aria-busy=${JSON.stringify(ariaBusy)}`,
    })
    if (ariaBusy === 'false') {
      findings.push({
        level: 'warning',
        message: `${path}: form aria-busy="false" — undefined 推奨 (デフォルト有効状態を明示する必要なし、SR ノイズ抑制、iter278 aria-invalid と同 pattern)`,
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

  console.log(`\n=== Findings (auth-aria-busy-iter282) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
