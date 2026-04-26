/**
 * Phase 6.15 loop iter 3 — Login 画面の Playwright 探索的 UX バグ発見。
 *
 * 観測対象:
 *   - console error / pageerror
 *   - network 4xx-5xx
 *   - hydration mismatch (suppressHydrationWarning は body だけ。それ以外で出ないか)
 *   - フォーム a11y (aria-* / autocomplete)
 *   - 失敗フロー (空 submit / 無効 email / 不正 password) の挙動
 *   - サインアップリンク遷移
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-login-iter3.ts
 * 前提: pnpm dev で port 3001 が起動済
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
      findings.push({
        level: t,
        source: 'console',
        message: msg.text().slice(0, 240),
      })
    }
  })
  page.on('pageerror', (err) => {
    findings.push({ level: 'error', source: 'pageerror', message: String(err).slice(0, 240) })
  })
  page.on('response', (res) => {
    if (res.status() >= 400 && !res.url().startsWith('data:')) {
      findings.push({
        level: 'error',
        source: 'network',
        message: `${res.status()} ${res.request().method()} ${res.url().slice(0, 120)}`,
      })
    }
  })

  console.log('[explore-login-iter3] navigating /login')
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.screenshot({ path: '/tmp/uiux-login-iter3-1-initial.png', fullPage: true })

  // a11y チェック: input に aria-label / autocomplete / required
  const emailInput = page.locator('input#email')
  const passwordInput = page.locator('input#password')
  const emailAttrs = await emailInput.evaluate((el) => ({
    type: el.getAttribute('type'),
    autocomplete: el.getAttribute('autocomplete'),
    required: el.hasAttribute('required'),
    ariaLabel: el.getAttribute('aria-label'),
    name: el.getAttribute('name'),
  }))
  const pwAttrs = await passwordInput.evaluate((el) => ({
    type: el.getAttribute('type'),
    autocomplete: el.getAttribute('autocomplete'),
    required: el.hasAttribute('required'),
    ariaLabel: el.getAttribute('aria-label'),
    name: el.getAttribute('name'),
  }))
  console.log('  email attrs:', emailAttrs)
  console.log('  password attrs:', pwAttrs)

  if (!emailAttrs.required) {
    findings.push({
      level: 'warning',
      source: 'a11y',
      message: 'login email input に required 属性なし (HTML5 検証が効かない)',
    })
  }
  if (!pwAttrs.required) {
    findings.push({
      level: 'warning',
      source: 'a11y',
      message: 'login password input に required 属性なし',
    })
  }

  // 空 submit でブラウザ検証 / サーバ検証どっちが効くか
  console.log('[explore-login-iter3] empty submit')
  await page.locator('button[type="submit"]').click()
  await page.waitForTimeout(800)
  await page.screenshot({ path: '/tmp/uiux-login-iter3-2-empty-submit.png' })

  // 不正 email + 短 password
  console.log('[explore-login-iter3] invalid creds')
  await emailInput.fill('not-an-email')
  await passwordInput.fill('x')
  await page.locator('button[type="submit"]').click()
  await page.waitForTimeout(1500)
  await page.screenshot({ path: '/tmp/uiux-login-iter3-3-invalid.png' })

  // サインアップリンク click
  console.log('[explore-login-iter3] signup link')
  const signupLink = page.locator('a[href="/signup"]')
  if ((await signupLink.count()) > 0) {
    await signupLink.first().click()
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: '/tmp/uiux-login-iter3-4-signup.png' })
    if (page.url() !== `${BASE}/signup`) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: `サインアップリンクで ${page.url()} に遷移 (期待: /signup)`,
      })
    }
  } else {
    findings.push({
      level: 'warning',
      source: 'observation',
      message: 'login にサインアップリンクが見つからない',
    })
  }

  await ctx.close()
  await browser.close()

  console.log('\n=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし)')
  } else {
    for (const f of findings) console.log(`  [${f.level}/${f.source}] ${f.message}`)
  }
  console.log(`\nTotal: ${findings.length}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => process.exit(0))
