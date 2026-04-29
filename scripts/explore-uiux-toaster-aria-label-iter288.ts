/**
 * Phase 6.15 loop iter 288 — sonner Toaster の aria-label が default で
 * "Notifications alt+T" の英語のまま、Japanese app と不一致な問題。
 *
 * 現状: src/app/layout.tsx で `<Toaster richColors position="bottom-right"
 * closeButton />` を mount。sonner は `containerAriaLabel = 'Notifications'`
 * を default として `${containerAriaLabel} ${hotkeyLabel}` で section の
 * aria-label を構築 (ref: node_modules/sonner/dist/index.mjs:920, 1082)。
 * 結果として `<section aria-label="Notifications alt+T">` が JP 環境にも
 * そのまま出る → SR 利用者に英語と日本語が混ざって聞こえる。
 *
 * 期待 (fix 後):
 *   `<Toaster ... containerAriaLabel="通知" />` を追加 → section の
 *   aria-label が "通知 alt+T" になる (hotkey 部分は universal 表記)。
 *
 * Supabase 不要 (Toaster は global layout 配置)。
 *
 *   pnpm tsx scripts/explore-uiux-toaster-aria-label-iter288.ts
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
    const ariaLabel = await page.locator('section[aria-label]').first().getAttribute('aria-label')
    findings.push({
      level: 'info',
      message: `${path}: <section aria-label>=${JSON.stringify(ariaLabel)}`,
    })
    if (!ariaLabel) {
      findings.push({
        level: 'warning',
        message: `${path}: Toaster section に aria-label が無い`,
      })
    } else if (!ariaLabel.startsWith('通知')) {
      findings.push({
        level: 'warning',
        message: `${path}: Toaster aria-label "${ariaLabel}" が "通知" で始まらない (英語ノイズ残存)`,
      })
    }
  }

  try {
    await audit('/login')
    await audit('/signup')
    await audit('/~offline')
  } finally {
    await context.close().catch(() => {})
    await browser.close().catch(() => {})
  }

  console.log(`\n=== Findings (toaster-aria-label-iter288) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
