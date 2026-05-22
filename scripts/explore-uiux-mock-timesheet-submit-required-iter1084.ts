/**
 * Phase 6.15 loop iter1084: mock-timesheet submit form の required field に required + aria-required
 * が付与されているかの regression guard。
 *
 * iter1084 で発見した bug: zod schema 上 workDate / category / hoursDecimal は必須 (description は
 * `z.string().max(2000)` で空文字許可なので任意) だが、DOM input には `required` 属性も
 * `aria-required="true"` も無く、SR / browser assistive tech に「必須」 signal が伝わっていなかった。
 * login-form / signup-form は同じ pattern を踏んでおり (required + aria-required), mock-submit-form
 * だけ漏れていた一貫性 gap。
 *
 * 修正 (mock-submit-form.tsx): tsDate / tsCategory / tsHours の 3 input に required + aria-required
 * を追加 (description は schema 上空文字許可なので付与せず)。
 *
 * 本 script は mock-timesheet login (固定認証、DB 不要) → /new ページ render → 3 必須 input の
 * required / aria-required 属性を browser DOM で確認する regression guard。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-mock-timesheet-submit-required-iter1084.ts
 * 前提: pnpm dev port 3001 起動済 (supabase 不要、mock-timesheet 固定認証で DB 不参照)
 */
import { chromium } from '@playwright/test'

const BASE = 'http://localhost:3001'

interface Finding {
  level: 'error' | 'warning' | 'info'
  source: string
  message: string
}

async function main() {
  const findings: Finding[] = []
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()

  // mock-timesheet login (固定認証)
  await page.goto(`${BASE}/mock-timesheet/login`, { waitUntil: 'networkidle' })
  await page.locator('input#tsEmail').fill('ops@example.com')
  await page.locator('input#tsPassword').fill('password1234')
  await page.locator('button#tsLoginSubmit').click()
  await page.waitForURL(`${BASE}/mock-timesheet/new`, { timeout: 10_000 })

  // required + aria-required の存在確認 (3 必須 input)
  const requiredSelectors = ['input#tsDate', 'select#tsCategory', 'input#tsHours']
  for (const sel of requiredSelectors) {
    const attrs = await page.locator(sel).evaluate((el) => ({
      hasRequired: el.hasAttribute('required'),
      ariaRequired: el.getAttribute('aria-required'),
    }))
    console.log(`${sel}: required=${attrs.hasRequired} aria-required=${attrs.ariaRequired}`)
    if (!attrs.hasRequired) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `${sel} に required HTML 属性が無い (zod schema 必須なのに DOM signal なし)`,
      })
    }
    if (attrs.ariaRequired !== 'true') {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `${sel} の aria-required が "true" でない (現在: ${attrs.ariaRequired})`,
      })
    }
  }

  // tsDescription は schema 上 z.string().max(2000) (空文字許可) なので required は付与しない確認
  const descAttrs = await page.locator('input#tsDescription').evaluate((el) => ({
    hasRequired: el.hasAttribute('required'),
    ariaRequired: el.getAttribute('aria-required'),
  }))
  console.log(
    `input#tsDescription: required=${descAttrs.hasRequired} aria-required=${descAttrs.ariaRequired}`,
  )
  if (descAttrs.hasRequired) {
    findings.push({
      level: 'warning',
      source: 'a11y',
      message: `input#tsDescription に required が付いているが schema は空文字許可 (z.string().max(2000)) — required 削除を検討`,
    })
  }

  await ctx.close()
  await browser.close()

  console.log('\n=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — mock-timesheet submit form の required signal は完備')
  } else {
    for (const f of findings) console.log(`  [${f.level}/${f.source}] ${f.message}`)
  }
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
