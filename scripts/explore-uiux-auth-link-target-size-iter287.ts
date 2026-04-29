/**
 * Phase 6.15 loop iter 287 — /login と /signup の CardFooter Link が
 * touch target size として小さすぎる問題 (WCAG 2.5.8 Level AA)。
 *
 * 現状: link 寸法 85.97 × 20 px。WCAG 2.5.8 (Target Size Minimum, Level AA、
 * WCAG 2.2 で追加) は pointer target ≥ 24 × 24 CSS pixels を要求する。
 * 高さ 20px は閾値未満。
 *
 * 例外:
 *   - "Inline" (sentence 内の link) → 該当しない、CardFooter で flex item
 *   - "Equivalent control" → ない
 *   - "User agent control" → ない
 *   - "Essential" → ない
 * いずれも該当せず、AA 違反。
 *
 * fix: 各 Link に `inline-flex items-center py-2` を追加 (1 行差替え × 2
 * ファイル)。inline-flex で flex 子要素として height padding 適用、py-2
 * (4 + 4 = 16px) で content 高 20 + padding 16 = 36px 高さに拡張。WCAG
 * 2.5.8 (24×24) を上回り、AAA 2.5.5 (44×44) には届かないが手指 / touch で
 * 押しやすい comfortable hit area。視覚 layout の変化は CardFooter 行高が
 * 20→36px に増えるのみ、文言・色・配置は不変。
 *
 *   pnpm tsx scripts/explore-uiux-auth-link-target-size-iter287.ts
 */
import { chromium } from '@playwright/test'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

const BASE = 'http://localhost:3001'
const MIN_AA_PX = 24

async function main(): Promise<void> {
  const findings: Finding[] = []
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await context.newPage()

  page.on('pageerror', (e) => {
    findings.push({ level: 'error', message: `pageerror: ${e.message}`.slice(0, 240) })
  })

  async function audit(path: string, expectedHref: string) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
    const link = page.locator(`a[href="${expectedHref}"]`).first()
    const rect = await link.evaluate((el) => {
      const r = (el as HTMLElement).getBoundingClientRect()
      return { width: r.width, height: r.height }
    })
    findings.push({
      level: 'info',
      message: `${path}: link[href="${expectedHref}"] size=${rect.width.toFixed(0)}×${rect.height.toFixed(0)}px`,
    })
    if (rect.height < MIN_AA_PX) {
      findings.push({
        level: 'warning',
        message: `${path}: link 高さ ${rect.height}px が WCAG 2.5.8 AA 閾値 ${MIN_AA_PX}px 未満`,
      })
    }
    if (rect.width < MIN_AA_PX) {
      findings.push({
        level: 'warning',
        message: `${path}: link 幅 ${rect.width}px が WCAG 2.5.8 AA 閾値 ${MIN_AA_PX}px 未満`,
      })
    }
  }

  try {
    await audit('/login', '/signup')
    await audit('/signup', '/login')
  } finally {
    await context.close().catch(() => {})
    await browser.close().catch(() => {})
  }

  console.log(`\n=== Findings (auth-link-target-size-iter287) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
