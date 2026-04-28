/**
 * Phase 6.15 loop iter 273 — /~offline 説明 2 段落の max-width 整合 探索。
 *
 * 現状:
 *   p1 ("ネットワーク接続が切れています...") : max-w-md text-sm
 *   p2 ("最強TODO はオフラインでも...")        : max-w-md 無し / text-xs
 *
 * p1 は max-w-md (= 28rem ≈ 448px) で幅が制限されるが p2 は制限無しで
 * 自然幅まで延びる。wide screen (1280px+) では 2 段落の折り返し位置が
 * バラつき視覚的に不一致。可読性も落ちる (1 行が長すぎる p2)。
 *
 * 期待 (fix 後):
 *   p2 にも max-w-md を付与。両段落で「行幅 ≦ 448px」の reading-rhythm 一致。
 *
 * Supabase 不要。
 *
 *   pnpm tsx scripts/explore-uiux-offline-text-width-iter273.ts
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
    const ps = await page.locator('main p').evaluateAll((els) =>
      els.map((el) => ({
        cls: el.className,
        width: (el as HTMLElement).offsetWidth,
        text: el.textContent?.trim().slice(0, 30),
      })),
    )
    findings.push({ level: 'info', message: `/~offline: ps=${JSON.stringify(ps)}` })
    if (ps.length < 2) {
      findings.push({ level: 'warning', message: `/~offline: <p> 2 段落想定 → ${ps.length}` })
    }
    const p0 = ps[0]
    const p1 = ps[1]
    if (ps.length >= 2 && p0 && p1) {
      const p1HasMaxW = p0.cls.includes('max-w-md')
      const p2HasMaxW = p1.cls.includes('max-w-md')
      findings.push({
        level: 'info',
        message: `/~offline: p1 max-w-md=${p1HasMaxW} / p2 max-w-md=${p2HasMaxW}`,
      })
      if (p1HasMaxW && !p2HasMaxW) {
        findings.push({
          level: 'warning',
          message: `/~offline: p1 のみ max-w-md、p2 が無制限 — wide screen で行長不一致 / p2 が読みづらい`,
        })
      }
    }
  } finally {
    await context.close().catch(() => {})
    await browser.close().catch(() => {})
  }

  console.log(`\n=== Findings (offline-text-width-iter273) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
