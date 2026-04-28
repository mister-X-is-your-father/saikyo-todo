/**
 * Phase 6.15 loop iter 274 — login / signup の server-error 時 focus 戻し探索。
 *
 * 現状: form submit → server が auth error (401 等) → toast.error + early
 * return。focus は submit button のままで、ユーザは「もう一度入力する」ために
 * Tab + Shift+Tab で email/password field まで戻る必要がある。
 *
 * 期待 (fix 後):
 *   server error 後、login は email field、signup も email field (or
 *   displayName) に focus を戻す。RHF の setFocus(name) で実現。SR にも
 *   focus 移動が伝わり、誤入力修正が即座に開始可能。
 *
 * 検証: source grep でも見れるが、本物の挙動確認は dev で signin して
 * 失敗 path を踏む必要があり、Supabase 不在環境では submit すると
 * loginAction が server error を返すはずなので、その時の document.activeElement
 * を確認する。
 *
 *   pnpm tsx scripts/explore-uiux-auth-error-focus-iter274.ts
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
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
    await page.locator('input#email').fill('test@example.com')
    await page.locator('input#password').fill('wrongpassword')
    await page.locator('button[type="submit"]').click()
    // server error or transition end を待つ
    await page.waitForTimeout(2000)
    const focused = await page.evaluate(() => {
      const a = document.activeElement
      if (!a) return 'null'
      return `${a.tagName}#${a.id || ''}`
    })
    findings.push({
      level: 'info',
      message: `/login: server error 後 activeElement=${focused}`,
    })
    if (focused !== 'INPUT#password') {
      findings.push({
        level: 'warning',
        message: `/login: server error 後 focus が password に戻っていない (現値=${focused}) — ユーザは Tab で戻る手間`,
      })
    }
  } finally {
    await context.close().catch(() => {})
    await browser.close().catch(() => {})
  }

  console.log(`\n=== Findings (auth-error-focus-iter274) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
