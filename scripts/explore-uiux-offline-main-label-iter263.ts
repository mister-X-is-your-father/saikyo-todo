/**
 * Phase 6.15 loop iter 263 — /~offline の `<main>` に aria-labelledby 探索。
 *
 * 現状: /~offline の `<main>` 直下に h1 ("オフラインです") があるが、
 * `<main>` 自体に aria-labelledby が無いため、SR の landmark 一覧では
 * "main" としか表示されない。複数 main 要素がある場合 (PWA で他ページが
 * 同居する状況) に「どの main か」見分けられない。
 *
 * 期待 (fix 後):
 *   /~offline の <main> に aria-labelledby="offline-heading"、h1 に
 *   id="offline-heading" を付与。landmark 一覧で "オフラインです, main"
 *   と announce される。
 *
 * Supabase 不要。
 *
 *   pnpm tsx scripts/explore-uiux-offline-main-label-iter263.ts
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
    const main = page.locator('main').first()
    const labelledBy = await main.getAttribute('aria-labelledby')
    const h1 = page.locator('h1').first()
    const h1Id = await h1.getAttribute('id')
    const h1Text = (await h1.textContent())?.trim()
    findings.push({
      level: 'info',
      message: `/~offline: main aria-labelledby=${labelledBy} h1 id=${h1Id} text=${JSON.stringify(h1Text)}`,
    })
    if (labelledBy !== 'offline-heading') {
      findings.push({
        level: 'warning',
        message: `/~offline: <main> に aria-labelledby="offline-heading" 不在 — landmark 一覧で "main" としか出ない`,
      })
    }
    if (h1Id !== 'offline-heading') {
      findings.push({
        level: 'warning',
        message: `/~offline: h1 に id="offline-heading" 不在 — aria-labelledby の参照先が解決しない`,
      })
    }
  } finally {
    await context.close().catch(() => {})
    await browser.close().catch(() => {})
  }

  console.log(`\n=== Findings (offline-main-label-iter263) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
