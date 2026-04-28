/**
 * Phase 6.15 loop iter 276 — login/signup submit button の aria-label 簡素化 探索。
 *
 * 現状: `aria-label={isPending ? 'ログイン処理中…' : 'ログイン'}` のように
 * 非 pending 時にも aria-label が visible text と全く同じ文言で set されて
 * いる。WCAG / ARIA spec: 「accessible name は visible label を含むべき」
 * を満たすが、非 pending 時は visible text 単独で SR は十分 announce できる
 * ため aria-label の duplicate は冗長 (場合によっては SR が visible text を
 * 別途 announce せずスキップする実装もあり得る)。
 *
 * 期待 (fix 後):
 *   非 pending 時: aria-label は undefined (visible text を SR が読む)
 *   pending 時:    aria-label = "ログイン処理中…" / "アカウント作成中…"
 *
 * 検証: Playwright で button の aria-label を確認 — 非 pending 時 null。
 *
 *   pnpm tsx scripts/explore-uiux-auth-button-aria-iter276.ts
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

  async function audit(path: string, expectedText: string) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
    const submit = page.locator('form button[type="submit"]').first()
    const aria = await submit.getAttribute('aria-label')
    const text = (await submit.textContent())?.trim()
    findings.push({
      level: 'info',
      message: `${path}: submit aria-label=${JSON.stringify(aria)} text=${JSON.stringify(text)}`,
    })
    if (text !== expectedText) {
      findings.push({
        level: 'warning',
        message: `${path}: submit visible text 期待=${expectedText} 実際=${text}`,
      })
    }
    if (path === '/login' && aria !== null && aria === text) {
      findings.push({
        level: 'warning',
        message: `${path}: 非 pending 時に aria-label="${aria}" が visible text と完全一致 — 冗長、undefined にすると SR が visible text を直接読む`,
      })
    }
    // /signup の場合は aria-label="アカウントを作成 (サインアップ)" の方が
    // SR に context を与えるので残す (visible "サインアップ" を name に含む
    // ため WCAG 2.5.3 準拠)。
    if (path === '/signup' && aria && !aria.includes(text ?? '')) {
      findings.push({
        level: 'warning',
        message: `${path}: aria-label="${aria}" が visible text "${text}" を含まない — WCAG 2.5.3 違反`,
      })
    }
  }

  try {
    await audit('/login', 'ログイン')
    await audit('/signup', 'サインアップ')
  } finally {
    await context.close().catch(() => {})
    await browser.close().catch(() => {})
  }

  console.log(`\n=== Findings (auth-button-aria-iter276) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
