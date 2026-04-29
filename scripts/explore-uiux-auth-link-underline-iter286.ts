/**
 * Phase 6.15 loop iter 286 — /login と /signup の CardFooter Link が
 * 非 hover 時 underline が無く、color のみで link を識別している問題。
 *
 * 現状: `text-primary ... underline-offset-4 hover:underline` で書かれており、
 * 非 hover 時は `text-decoration: none`。link 色 (text-primary、現テーマで
 * rgb(23,23,23) ほぼ黒) と surrounding span 色 (text-muted-foreground、
 * rgb(115,115,115) 中グレー) のコントラストは 3.78:1。
 *
 * WCAG 1.4.1 (Use of Color, Level A): "Color is not used as the only visual
 * means of conveying information." link を distinguish するために色を使う場合:
 *   (a) 常時 underline、または
 *   (b) link/surrounding text の色コントラスト ≥ 3:1 + hover/focus 時に
 *       non-color 視覚表示 (G183 technique)
 * 現状は (b) を辛うじて満たすが (3.78 ≥ 3、hover で underline)、
 *   - 色覚異常で luminance 差を感知しにくい場合
 *   - hover できない (touch device、SR + 音声制御) ユーザ
 * に link であることが伝わりにくい。
 *
 * fix: 常時 underline 化 (`hover:underline` → `underline`)。WCAG 1.4.1 を
 * 確実に満たし、touch / SR / 色覚異常ユーザにも一貫した link 識別を提供。
 *
 * Supabase 不要。
 *
 *   pnpm tsx scripts/explore-uiux-auth-link-underline-iter286.ts
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

  async function audit(path: string, expectedHref: string) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
    const link = page.locator(`a[href="${expectedHref}"]`).first()
    const decoration = await link.evaluate(
      (el) => window.getComputedStyle(el as HTMLElement).textDecorationLine,
    )
    findings.push({
      level: 'info',
      message: `${path}: link[href="${expectedHref}"] text-decoration-line=${JSON.stringify(decoration)}`,
    })
    if (decoration !== 'underline') {
      findings.push({
        level: 'warning',
        message: `${path}: link が非 hover 時に underline されていない (decoration=${decoration})`,
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

  console.log(`\n=== Findings (auth-link-underline-iter286) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
