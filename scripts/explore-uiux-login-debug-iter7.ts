/**
 * Phase 6.15 loop iter 7 — Login UI signin が動かない原因を詳細追跡。
 *
 * iter6 で「正しい資格で submit しても /login のまま」と発見。原因仮説:
 * (1) form submit が走ってない / button click 効いてない
 * (2) Server Action が呼ばれてない (RSC POST が dev で 4xx)
 * (3) supabase auth cookie が設定されない
 * (4) router.push('/') が dev で動かない
 *
 * 観測:
 *   - すべての network request/response を log (POST 系特に)
 *   - cookie before/after
 *   - console / pageerror
 *   - submit 後の form value (空 / 残る)
 *   - toast (sonner) 表示
 */
import { chromium } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const BASE = 'http://localhost:3001'
const SUPABASE_URL = 'http://127.0.0.1:54321'

async function main() {
  const stamp = Date.now()
  const email = `iter7-${stamp}@example.com`
  const password = 'password1234'
  const admin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })
  const cu = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (cu.error || !cu.data.user) throw cu.error
  const userId = cu.data.user.id
  console.log(`[iter7] user=${userId} email=${email}`)

  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()

  page.on('console', (m) => console.log(`  [console.${m.type()}]`, m.text().slice(0, 200)))
  page.on('pageerror', (e) => console.log(`  [pageerror]`, String(e).slice(0, 200)))
  page.on('request', (req) => {
    if (req.method() !== 'GET' || req.url().includes('auth') || req.url().includes('action')) {
      console.log(`  [req] ${req.method()} ${req.url().slice(0, 140)}`)
    }
  })
  page.on('response', async (res) => {
    const u = res.url()
    if (
      res.request().method() !== 'GET' ||
      u.includes('auth') ||
      u.includes('action') ||
      res.status() >= 300
    ) {
      console.log(`  [res] ${res.status()} ${res.request().method()} ${u.slice(0, 140)}`)
    }
  })

  try {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
    const cookiesBefore = await ctx.cookies()
    console.log(`[iter7] cookies before submit: ${cookiesBefore.length}`)

    await page.locator('input#email').fill(email)
    await page.locator('input#password').fill(password)
    console.log('[iter7] clicking submit...')
    await page.locator('button[type="submit"]').click()

    // 5 秒待つ (Server Action / 遷移を含む)
    await page.waitForTimeout(5000)

    console.log(`[iter7] url after wait: ${page.url()}`)
    const cookiesAfter = await ctx.cookies()
    console.log(`[iter7] cookies after submit: ${cookiesAfter.length}`)
    for (const c of cookiesAfter) {
      console.log(`    cookie: ${c.name}=${c.value.slice(0, 30)}... domain=${c.domain}`)
    }

    // toast
    const toastTexts = await page.locator('[data-sonner-toast]').allTextContents()
    console.log(`[iter7] toasts: ${JSON.stringify(toastTexts)}`)

    // form 値が残っているか
    const emailVal = await page.locator('input#email').inputValue()
    const pwVal = await page.locator('input#password').inputValue()
    console.log(`[iter7] form values after: email="${emailVal}" pw_len=${pwVal.length}`)

    // page heading
    const heading = await page.locator('[data-slot="card-title"]').first().textContent()
    console.log(`[iter7] heading: ${heading}`)

    await page.screenshot({ path: '/tmp/uiux-login-debug-iter7.png', fullPage: true })

    // Supabase admin client で sign-in が動くか直接確認
    const userClient = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false },
    })
    const r = await userClient.auth.signInWithPassword({ email, password })
    console.log(`[iter7] direct signInWithPassword ok=${!r.error} user=${r.data.user?.id}`)
  } finally {
    await ctx.close()
    await browser.close()
    await admin.auth.admin.deleteUser(userId).catch(() => {})
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => process.exit(0))
