/**
 * Phase 6.15 loop iter 4 — Signup 画面 + iter3 保留の signup link 遷移再検証。
 *
 * 観測:
 *   - /login → signup link click が **本当に /signup に遷移する** か (新規 page で)
 *   - /signup の form a11y (required / autocomplete / pattern / minLength)
 *   - 不正値 submit で console error / network 4xx-5xx
 *   - サインアップ後の遷移 (本物 supabase に到達せず error 期待)
 */
import { chromium, type ConsoleMessage } from '@playwright/test'

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

  page.on('console', (msg: ConsoleMessage) => {
    const t = msg.type()
    if (t === 'error' || t === 'warning') {
      findings.push({ level: t, source: 'console', message: msg.text().slice(0, 240) })
    }
  })
  page.on('pageerror', (err) =>
    findings.push({ level: 'error', source: 'pageerror', message: String(err).slice(0, 240) }),
  )
  page.on('response', (res) => {
    if (res.status() >= 400 && !res.url().startsWith('data:')) {
      findings.push({
        level: 'error',
        source: 'network',
        message: `${res.status()} ${res.request().method()} ${res.url().slice(0, 120)}`,
      })
    }
  })

  // 1. /login で fresh load → signup link 単独 click (iter3 では invalid submit 後だったため再検証)
  console.log('[explore-signup-iter4] /login fresh → signup link click')
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.locator('a[href="/signup"]').first().click()
  await page.waitForLoadState('networkidle')
  const urlAfter = page.url()
  console.log('  url after click:', urlAfter)
  if (urlAfter !== `${BASE}/signup`) {
    findings.push({
      level: 'error',
      source: 'observation',
      message: `signup link click 失敗 (url=${urlAfter}, 期待: ${BASE}/signup)`,
    })
  } else {
    console.log('  → signup link 遷移は **正常** (iter3 の観測は invalid submit との競合だった)')
  }
  await page.screenshot({ path: '/tmp/uiux-signup-iter4-1-after-link.png', fullPage: true })

  // 2. signup form の a11y チェック
  const inputs = await page.locator('input').all()
  const attrsList: Array<{
    id: string | null
    required: boolean
    ac: string | null
    type: string | null
  }> = []
  for (const inp of inputs) {
    const a = await inp.evaluate((el) => ({
      id: el.getAttribute('id'),
      required: el.hasAttribute('required'),
      ac: el.getAttribute('autocomplete'),
      type: el.getAttribute('type'),
    }))
    attrsList.push(a)
  }
  console.log('  signup inputs:', attrsList)
  for (const a of attrsList) {
    if (!a.required && a.id) {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message: `signup ${a.id} input に required 属性なし`,
      })
    }
    if (!a.ac && a.id && a.type !== 'submit') {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message: `signup ${a.id} input に autocomplete 属性なし`,
      })
    }
  }

  // 3. 短いパスワード送信 → エラー表示確認
  console.log('[explore-signup-iter4] short password submit')
  const emailField = page.locator('input[type="email"]').first()
  const pwField = page.locator('input[type="password"]').first()
  if ((await emailField.count()) > 0 && (await pwField.count()) > 0) {
    await emailField.fill(`test-${Date.now()}@example.com`)
    await pwField.fill('short')
    await page.locator('button[type="submit"]').click()
    await page.waitForTimeout(1500)
    await page.screenshot({ path: '/tmp/uiux-signup-iter4-2-short-pw.png' })
    // toast / inline error が出ているか
    const toastVisible = await page.locator('[data-sonner-toast]').count()
    if (toastVisible === 0) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: 'signup 短 password 送信後に toast / エラー表示が見つからない',
      })
    }
  }

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
