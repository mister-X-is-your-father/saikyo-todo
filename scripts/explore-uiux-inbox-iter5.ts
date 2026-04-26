/**
 * Phase 6.15 loop iter 5 — 未 login → workspace url アクセス時の redirect 確認
 * + signup-form a11y 修正 (iter4 持ち越し) の動作再検証。
 */
import { chromium } from '@playwright/test'

const BASE = 'http://localhost:3001'

interface Finding {
  level: 'error' | 'warning' | 'info'
  source: 'console' | 'pageerror' | 'network' | 'a11y' | 'observation'
  message: string
}

async function main() {
  const findings: Finding[] = []
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()

  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') {
      findings.push({
        level: m.type() as 'error' | 'warning',
        source: 'console',
        message: m.text().slice(0, 240),
      })
    }
  })
  page.on('pageerror', (e) =>
    findings.push({ level: 'error', source: 'pageerror', message: String(e).slice(0, 240) }),
  )
  page.on('response', (res) => {
    if (res.status() >= 500 && !res.url().startsWith('data:')) {
      findings.push({
        level: 'error',
        source: 'network',
        message: `${res.status()} ${res.url().slice(0, 120)}`,
      })
    }
  })

  // 1. 未 login で workspace 風 path に GET → /login redirect 期待
  const fakeWsId = '00000000-0000-0000-0000-000000000000'
  console.log(`[explore-iter5] navigate /${fakeWsId} (unauthenticated)`)
  const r = await page.goto(`${BASE}/${fakeWsId}`, { waitUntil: 'networkidle' })
  console.log(`  status=${r?.status()} final=${page.url()}`)
  if (!page.url().startsWith(`${BASE}/login`)) {
    findings.push({
      level: 'warning',
      source: 'observation',
      message: `未 login workspace アクセスで /login redirect されない (final=${page.url()})`,
    })
  }
  await page.screenshot({ path: '/tmp/uiux-inbox-iter5-1-redirect.png', fullPage: true })

  // 2. signup-form 再検証 (iter4 持ち越し: required を追加した)
  console.log('[explore-iter5] signup form 再検証')
  await page.goto(`${BASE}/signup`, { waitUntil: 'networkidle' })
  for (const id of ['displayName', 'email', 'password']) {
    const required = await page.locator(`input#${id}`).first().getAttribute('required')
    const ariaRequired = await page.locator(`input#${id}`).first().getAttribute('aria-required')
    const minLength = await page.locator(`input#${id}`).first().getAttribute('minlength')
    console.log(
      `  ${id}: required=${required !== null} aria-required=${ariaRequired} minLength=${minLength}`,
    )
    if (required === null) {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message: `signup ${id} に required 未付与 (修正漏れ)`,
      })
    }
  }
  await page.screenshot({ path: '/tmp/uiux-inbox-iter5-2-signup.png' })

  await ctx.close()
  await browser.close()

  console.log('\n=== Findings ===')
  if (findings.length === 0) console.log('(なし)')
  else for (const f of findings) console.log(`  [${f.level}/${f.source}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => process.exit(0))
