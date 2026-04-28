/**
 * Phase 6.15 loop iter 277 — /~offline home Link の aria-label 重複削減 探索。
 *
 * 現状: `<Link href="/" aria-label="ホームに戻る">ホームに戻る</Link>`。
 * aria-label と visible text が完全一致で重複。SR は accessible name 算出で
 * aria-label を優先するため visible text を override。iter276 の login
 * button と同じパターン。
 *
 * 期待 (fix 後):
 *   aria-label を外し、visible text "ホームに戻る" を SR が直接読む。
 *
 * Supabase 不要。
 *
 *   pnpm tsx scripts/explore-uiux-offline-link-aria-iter277.ts
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
    await page.goto(`${BASE}/~offline`, { waitUntil: 'networkidle' })
    const link = page.locator('a[href="/"]').first()
    const aria = await link.getAttribute('aria-label')
    const text = (await link.textContent())?.trim()
    findings.push({
      level: 'info',
      message: `/~offline: home link aria-label=${JSON.stringify(aria)} text=${JSON.stringify(text)}`,
    })
    if (aria !== null && aria === text) {
      findings.push({
        level: 'warning',
        message: `/~offline: home link の aria-label="${aria}" が visible text と完全一致 — 冗長 (iter276 と同パターン)`,
      })
    }
  } finally {
    await context.close().catch(() => {})
    await browser.close().catch(() => {})
  }

  console.log(`\n=== Findings (offline-link-aria-iter277) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
