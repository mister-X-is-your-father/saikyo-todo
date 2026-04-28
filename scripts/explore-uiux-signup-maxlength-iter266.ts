/**
 * Phase 6.15 loop iter 266 — signup displayName の maxLength 整合性 探索。
 *
 * 現状: zod schema 側で `displayName: z.string().min(1).max(50)` だが、
 * `<IMEInput id="displayName">` には `maxLength` 属性が無い。ユーザは
 * 51 文字以上タイプ可能で、submit 時に zod が「displayName must be at most
 * 50 characters」(default zod message) を返して inline error が出るが、
 * その時点で既にユーザは打鍵を消す手間を負う。
 *
 * 期待 (fix 後):
 *   `<IMEInput id="displayName" maxLength={50}>` で 50 文字以上は IME 確定後に
 *   切り捨て、zod の max(50) と整合。submit 前に明示的にブロック。
 *
 * Supabase 不要。
 *
 *   pnpm tsx scripts/explore-uiux-signup-maxlength-iter266.ts
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
    await page.goto(`${BASE}/signup`, { waitUntil: 'networkidle' })
    const dn = page.locator('input#displayName')
    const maxLen = await dn.getAttribute('maxlength')
    const minLen = await dn.getAttribute('minlength')
    findings.push({
      level: 'info',
      message: `/signup: displayName minlength=${minLen} maxlength=${maxLen}`,
    })
    if (maxLen !== '50') {
      findings.push({
        level: 'warning',
        message: `/signup: displayName に maxlength=50 不在 (現値=${maxLen}) — zod の max(50) と非整合、ユーザは 51 文字以上打鍵してから error で消す手間`,
      })
    }
  } finally {
    await context.close().catch(() => {})
    await browser.close().catch(() => {})
  }

  console.log(`\n=== Findings (signup-maxlength-iter266) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
