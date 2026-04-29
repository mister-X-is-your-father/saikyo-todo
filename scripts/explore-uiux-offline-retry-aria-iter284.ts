/**
 * Phase 6.15 loop iter 284 — /~offline retry button の aria-label が
 * visible text を substring 含まない問題 (WCAG 2.5.3 Label in Name 違反)。
 *
 * 現状: visible="再読み込みして再試行" / aria-label="ページを再読み込みして接続を再試行"
 * 前者を後者の連続 substring と仮定して文字単位で見ると:
 *   visible = 再 読 み 込 み し て 再 試 行 (10 chars)
 *   accessible = ペ ー ジ を 再 読 み 込 み し て 接 続 を 再 試 行 (17 chars)
 *   accessible 中で visible[0..7] "再読み込みして" は match (pos 4-10) だが
 *   その直後 accessible は "接続を" が挟まり visible 後半 "再試行" まで連続
 *   しない → 連続 substring NOT contained。
 *
 * iter281 (login pending button) と同種の WCAG 2.5.3 違反。iter277 で「visible
 * を含む有用な拡張」と判定して維持したが substring 判定が誤りだった。
 *
 * 期待 (fix 後):
 *   aria-label が visible "再読み込みして再試行" を先頭 substring として含む。
 *   例: "再読み込みして再試行 (ページ全体を読み直して接続を回復)"
 *
 *   pnpm tsx scripts/explore-uiux-offline-retry-aria-iter284.ts
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
    const btn = page.locator('button[type="button"]').first()
    const aria = await btn.getAttribute('aria-label')
    const text = (await btn.textContent())?.trim()
    findings.push({
      level: 'info',
      message: `/~offline retry: aria-label=${JSON.stringify(aria)} visible=${JSON.stringify(text)}`,
    })
    if (!aria || !text) {
      findings.push({
        level: 'warning',
        message: `/~offline retry: aria-label or visible text 空`,
      })
    } else if (!aria.includes(text)) {
      findings.push({
        level: 'warning',
        message: `WCAG 2.5.3 違反: aria-label "${aria}" が visible "${text}" を連続 substring として含まない`,
      })
    } else if (!aria.startsWith(text)) {
      findings.push({
        level: 'info',
        message: `WCAG 2.5.3 best practice: visible は accessible name の **先頭** にあるのが望ましい (現在は内部位置 ${aria.indexOf(text)})`,
      })
    }
  } finally {
    await context.close().catch(() => {})
    await browser.close().catch(() => {})
  }

  console.log(`\n=== Findings (offline-retry-aria-iter284) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
