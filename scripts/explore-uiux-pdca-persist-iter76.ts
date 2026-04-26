/**
 * Phase 6.15 loop iter 76 — PDCA の period (30/90) が URL に永続化されるか確認。
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
  const email = `iter76-${stamp}@example.com`
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
    ws_name: `iter76-${stamp}`,
    ws_slug: `iter76-${stamp}`,
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

  try {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
    await page.locator('input#email').fill(email)
    await page.locator('input#password').fill(password)
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(`${BASE}/`, { timeout: 10_000 })
    await page.goto(`${BASE}/${workspaceId}/pdca`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await page.locator('[data-testid="pdca-period-90"]').click()
    await page.waitForTimeout(400)
    const url1 = page.url()
    console.log(`[iter76] url after 90 click: ${url1}`)
    if (!url1.includes('pdcaDays=90')) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: 'URL に pdcaDays=90 が反映されない',
      })
    }
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    const pressed90 = await page
      .locator('[data-testid="pdca-period-90"]')
      .evaluate((el) => el.getAttribute('aria-pressed'))
    console.log(`[iter76] aria-pressed after reload: ${pressed90}`)
    if (pressed90 !== 'true') {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: 'reload 後も 90 日 button が aria-pressed=true にならない',
      })
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
