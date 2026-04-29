/**
 * Phase 6.15 loop iter 285 — /login と /signup の heading が CardTitle (div +
 * role="heading" aria-level=1) で実装されていて native h1 ではない問題。
 *
 * 現状: shadcn `<CardTitle>` は内部 `<div>`。各 auth page は
 *   <CardTitle id="..." role="heading" aria-level={1} className="text-2xl">
 *     ログイン / サインアップ
 *   </CardTitle>
 * で SR には heading-level-1 として認識される (ARIA で正しく announce)。
 *
 * しかし native `<h1>` ではないため:
 *   - ブラウザ document outline (a11y dev tool / Reader Mode 等) が拾わない
 *   - HTML5 semantic outline が空 (h1 ゼロ)
 *   - codebase 内 /~offline は `<h1 id="offline-heading">` で native h1 を使い、
 *     auth ページ 2 つだけが div + role override で非対称
 *
 * SR 体験は同じだが、native heading を採用することで HTML5 semantic 一貫性 +
 * dev tooling / browser feature で picked up されるメリット。
 *
 * 期待 (fix 後):
 *   /login と /signup で
 *     `document.querySelectorAll('h1').length === 1`
 *     h1 の id = login-heading / signup-heading (form aria-labelledby 指定先)
 *   role="heading" 付き要素は h1 と同一 (= h1 が implicit role を持つ)。
 *
 *   pnpm tsx scripts/explore-uiux-auth-native-h1-iter285.ts
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

  async function audit(path: string, expectedId: string, expectedText: string) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })

    const h1Info = await page.evaluate(() => {
      const list = Array.from(document.querySelectorAll('h1')).map((h) => ({
        id: h.id || null,
        text: (h.textContent ?? '').trim(),
        explicitRole: h.getAttribute('role'),
        explicitAriaLevel: h.getAttribute('aria-level'),
      }))
      return list
    })
    findings.push({ level: 'info', message: `${path}: <h1> 要素 = ${JSON.stringify(h1Info)}` })

    if (h1Info.length === 0) {
      findings.push({
        level: 'warning',
        message: `${path}: native <h1> 要素が見つからない (heading が div + role="heading" のみ)`,
      })
    } else if (h1Info.length > 1) {
      findings.push({
        level: 'warning',
        message: `${path}: <h1> 要素が ${h1Info.length} 件 (1 件期待)`,
      })
    } else {
      const h1 = h1Info[0]!
      if (h1.id !== expectedId) {
        findings.push({
          level: 'warning',
          message: `${path}: <h1> id="${h1.id}" 期待="${expectedId}" — form aria-labelledby reference が壊れる`,
        })
      }
      if (h1.text !== expectedText) {
        findings.push({
          level: 'warning',
          message: `${path}: <h1> text="${h1.text}" 期待="${expectedText}"`,
        })
      }
      if (h1.explicitRole === 'heading' || h1.explicitAriaLevel) {
        findings.push({
          level: 'info',
          message: `${path}: <h1> に role/aria-level 明示が残っている (native h1 では implicit、削除推奨)`,
        })
      }
    }

    // form の aria-labelledby が <h1> id と一致すること (landmark name 維持)
    const formAriaLabelledby = await page.locator('form').first().getAttribute('aria-labelledby')
    if (formAriaLabelledby !== expectedId) {
      findings.push({
        level: 'warning',
        message: `${path}: form aria-labelledby="${formAriaLabelledby}" 期待="${expectedId}"`,
      })
    }
  }

  try {
    await audit('/login', 'login-heading', 'ログイン')
    await audit('/signup', 'signup-heading', 'サインアップ')
  } finally {
    await context.close().catch(() => {})
    await browser.close().catch(() => {})
  }

  console.log(`\n=== Findings (auth-native-h1-iter285) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
