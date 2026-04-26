/**
 * Phase 6.15 loop iter 12 — Goals (OKR) 画面 (/<wsId>/goals) を探索。
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
  const email = `iter12-${stamp}@example.com`
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
    ws_name: `iter12-${stamp}`,
    ws_slug: `iter12-${stamp}`,
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

    await page.goto(`${BASE}/${workspaceId}/goals`, { waitUntil: 'networkidle' })
    await page.screenshot({ path: '/tmp/uiux-goals-iter12-1.png', fullPage: true })

    const headings = await page.locator('h1, h2, h3, [data-slot=card-title]').allTextContents()
    const inputs = await page.locator('input').count()
    const buttons = await page.locator('button').count()
    console.log(
      `[iter12] /goals: inputs=${inputs} buttons=${buttons} headings=${JSON.stringify(headings.slice(0, 6))}`,
    )

    // form の input を全部走査して a11y チェック
    const formInputs = await page.locator('input, textarea, select').all()
    for (const inp of formInputs) {
      const id = await inp.getAttribute('id')
      const required = await inp.getAttribute('required')
      const type = await inp.getAttribute('type')
      const placeholder = await inp.getAttribute('placeholder')
      if (!id) continue
      if (type === 'submit' || type === 'button') continue
      // visible なものだけチェック
      const visible = await inp.isVisible()
      if (!visible) continue
      console.log(
        `  input id=${id} type=${type} required=${required !== null} placeholder="${placeholder ?? ''}"`,
      )
      if (required === null && type !== 'checkbox' && type !== 'radio' && type !== 'date') {
        // 必須項目候補は title / name 系のみ (description は optional とみなす)
        if (id.toLowerCase().match(/title|name|email|password/)) {
          findings.push({
            level: 'warning',
            source: 'a11y',
            message: `/goals form: input#${id} (type=${type}) に required なし`,
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
