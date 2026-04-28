/**
 * Phase 6.15 loop iter 278 — login/signup input の aria-invalid="false" 不要 探索。
 *
 * 現状: 各 input に `aria-invalid={Boolean(form.formState.errors.<name>)}`。
 * RHF は formState.errors が空の時に undefined を返すので Boolean() で
 * false に。結果として全 input に常時 `aria-invalid="false"` が付く。
 * ARIA spec: aria-invalid はエラー状態 (true / "spelling" / "grammar")
 * を表す属性で、デフォルト (有効) は属性自体が **不在** が推奨。"false" を
 * 明示すると一部 SR で「有効」とアナウンスして余分なノイズになる。
 *
 * 期待 (fix 後):
 *   `aria-invalid={form.formState.errors.<name> ? true : undefined}`
 *   or `aria-invalid={form.formState.errors.<name> ? 'true' : undefined}`
 *   error 時のみ属性が現れる。
 *
 * Supabase 不要。
 *
 *   pnpm tsx scripts/explore-uiux-auth-aria-invalid-iter278.ts
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
    const inputs = await page.locator('form input').evaluateAll((els) =>
      els.map((el) => ({
        id: el.getAttribute('id'),
        ariaInvalid: el.getAttribute('aria-invalid'),
      })),
    )
    findings.push({ level: 'info', message: `${path}: form inputs=${JSON.stringify(inputs)}` })
    const falseCount = inputs.filter((i) => i.ariaInvalid === 'false').length
    if (falseCount > 0) {
      findings.push({
        level: 'warning',
        message: `${path}: aria-invalid="false" が ${falseCount} 件 — undefined 推奨 (デフォルト有効状態を明示する必要なし、SR ノイズ抑制)`,
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

  console.log(`\n=== Findings (auth-aria-invalid-iter278) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
