/**
 * Phase 6.15 loop iter 14 — Time-entries 画面 (/<wsId>/time-entries) を探索。
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
  const email = `iter14-${stamp}@example.com`
  const password = 'password1234'
  const admin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })
  const cu = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (cu.error || !cu.data.user) throw cu.error
  const userId = cu.data.user.id

  const userClient = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  })
  await userClient.auth.signInWithPassword({ email, password })
  const { data: wsId } = await userClient.rpc('create_workspace', {
    ws_name: `iter14-${stamp}`,
    ws_slug: `iter14-${stamp}`,
  })
  const workspaceId = wsId as string

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

  try {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
    await page.locator('input#email').fill(email)
    await page.locator('input#password').fill(password)
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(`${BASE}/`, { timeout: 10_000 })

    const t0 = Date.now()
    await page.goto(`${BASE}/${workspaceId}/time-entries`, { waitUntil: 'networkidle' })
    const navMs = Date.now() - t0
    await page.screenshot({ path: '/tmp/uiux-time-entries-iter14-1.png', fullPage: true })

    const headings = await page.locator('h1, h2, h3, [data-slot=card-title]').allTextContents()
    const inputs = await page.locator('input').count()
    const buttons = await page.locator('button').count()
    console.log(
      `[iter14] /time-entries nav=${navMs}ms inputs=${inputs} buttons=${buttons} headings=${JSON.stringify(headings.slice(0, 6))}`,
    )

    // form の input を全て確認
    const formInputs = await page.locator('input, textarea, select').all()
    for (const inp of formInputs) {
      const id = await inp.getAttribute('id')
      const name = await inp.getAttribute('name')
      const required = await inp.getAttribute('required')
      const type = await inp.getAttribute('type')
      const placeholder = await inp.getAttribute('placeholder')
      const visible = await inp.isVisible()
      if (!visible) continue
      if (type === 'submit' || type === 'button') continue
      const key = id ?? name ?? '(no-id)'
      console.log(
        `  input ${key} type=${type} required=${required !== null} placeholder="${placeholder ?? ''}"`,
      )
      if (required === null && type !== 'checkbox' && type !== 'radio') {
        // 必須候補: workDate / durationMinutes / category 系
        if ((id ?? name ?? '').toLowerCase().match(/date|duration|minutes|category|description/)) {
          findings.push({
            level: 'warning',
            source: 'a11y',
            message: `/time-entries form: ${key} (type=${type}) に required なし`,
          })
        }
      }
    }
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
