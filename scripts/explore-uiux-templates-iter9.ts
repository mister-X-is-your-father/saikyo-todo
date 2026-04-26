/**
 * Phase 6.15 loop iter 9 — Templates 画面探索 (新画面) + workspace 作成 form の required 反映確認。
 */
import { chromium } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const BASE = 'http://localhost:3001'
const SUPABASE_URL = 'http://127.0.0.1:54321'

interface Finding {
  level: 'error' | 'warning' | 'info'
  source: 'console' | 'pageerror' | 'network' | 'a11y' | 'observation'
  message: string
}

async function main() {
  const findings: Finding[] = []
  const stamp = Date.now()
  const email = `iter9-${stamp}@example.com`
  const password = 'password1234'
  const admin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })
  const cu = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (cu.error || !cu.data.user) throw cu.error
  const userId = cu.data.user.id

  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning')
      findings.push({
        level: m.type() as 'error' | 'warning',
        source: 'console',
        message: m.text().slice(0, 240),
      })
  })
  page.on('pageerror', (e) =>
    findings.push({ level: 'error', source: 'pageerror', message: String(e).slice(0, 240) }),
  )
  page.on('response', (res) => {
    if (res.status() >= 500)
      findings.push({
        level: 'error',
        source: 'network',
        message: `${res.status()} ${res.url().slice(0, 120)}`,
      })
  })

  let workspaceId: string | undefined
  try {
    // login
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
    await page.locator('input#email').fill(email)
    await page.locator('input#password').fill(password)
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(`${BASE}/`, { timeout: 10_000 })

    // workspace 作成 form の required 確認 (iter8 持ち越し → 本 iter で修正したやつ)
    const nameRequired = await page.locator('input#name').getAttribute('required')
    const slugRequired = await page.locator('input#slug').getAttribute('required')
    console.log(
      `[iter9] ws form: name.required=${nameRequired !== null} slug.required=${slugRequired !== null}`,
    )
    if (nameRequired === null) {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message: '/ root: name input required 修正漏れ',
      })
    }
    if (slugRequired === null) {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message: '/ root: slug input required 修正漏れ',
      })
    }

    // workspace を作成 (rpc 経由が早いので Playwright form は省略)
    const userClient = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false },
    })
    await userClient.auth.signInWithPassword({ email, password })
    const { data: wsId } = await userClient.rpc('create_workspace', {
      ws_name: `iter9-${stamp}`,
      ws_slug: `iter9-${stamp}`,
    })
    workspaceId = wsId as string
    await page.reload({ waitUntil: 'networkidle' })

    // /<wsId>/templates へ navigate
    console.log(`[iter9] navigating /${workspaceId}/templates`)
    await page.goto(`${BASE}/${workspaceId}/templates`, { waitUntil: 'networkidle' })
    await page.screenshot({ path: '/tmp/uiux-templates-iter9-1.png', fullPage: true })

    // a11y / 表示観察
    const inputs = await page.locator('input').count()
    const buttons = await page.locator('button').count()
    const headings = await page.locator('h1, h2, h3, [data-slot=card-title]').allTextContents()
    console.log(
      `[iter9] templates: inputs=${inputs} buttons=${buttons} headings=${JSON.stringify(headings)}`,
    )
  } finally {
    await ctx.close()
    await browser.close()
    await admin.auth.admin.deleteUser(userId).catch(() => {})
  }

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
