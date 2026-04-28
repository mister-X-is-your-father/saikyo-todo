/**
 * Phase 6.15 loop iter 279 — signup displayName の spellCheck 探索。
 *
 * 現状: `<IMEInput id="displayName">` に spellCheck/autocapitalize 指定無し。
 * type="text" の default は browser 環境依存で spellcheck=true。ユーザが
 * "Hiroshi", "Tanaka" など固有名詞 / 短いハンドルを入力すると、ブラウザ
 * の spell-checker が「Hiroshi → His」のように修正を提案 / 下線を引く。
 * 名前フィールドで spell-check は誤動作の元。
 *
 * 期待 (fix 後):
 *   spellCheck={false} を追加 (iter257 で email に入れた pattern と同じ)。
 *   autoCapitalize は意見の分かれるところで「種々の display name (英大小 /
 *   絵文字 / nickname)」が来る前提で 'none' は強すぎる、デフォルト維持で OK。
 *
 * Supabase 不要。
 *
 *   pnpm tsx scripts/explore-uiux-signup-displayname-spell-iter279.ts
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
    const spell = await dn.getAttribute('spellcheck')
    findings.push({ level: 'info', message: `/signup: displayName spellcheck=${spell}` })
    if (spell !== 'false') {
      findings.push({
        level: 'warning',
        message: `/signup: displayName に spellCheck=false 不在 (現値=${spell}) — ブラウザ spell-checker が固有名詞を誤判定する risk`,
      })
    }
  } finally {
    await context.close().catch(() => {})
    await browser.close().catch(() => {})
  }

  console.log(`\n=== Findings (signup-displayname-spell-iter279) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
