/**
 * Phase 6.15 loop iter 28 — Backlog view を items 30 件投入で性能/render 確認。
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
  const email = `iter28-${stamp}@example.com`
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
    ws_name: `iter28-${stamp}`,
    ws_slug: `iter28-${stamp}`,
  })
  const workspaceId = wsId as string

  await admin.from('items').insert(
    Array.from({ length: 30 }, (_, i) => ({
      workspace_id: workspaceId,
      title: `iter28 item ${i + 1}`,
      status: i % 3 === 0 ? 'todo' : i % 3 === 1 ? 'in_progress' : 'done',
      priority: ((i % 4) + 1) as 1 | 2 | 3 | 4,
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })),
  )

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
    await page.goto(`${BASE}/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2500)

    const t0 = Date.now()
    await page
      .locator('button:has-text("Backlog"), [role="tab"]:has-text("Backlog")')
      .first()
      .click()
    await page.waitForTimeout(1500)
    console.log(`[iter28] backlog switch: ${Date.now() - t0}ms`)

    const rows = await page.locator('tbody tr').count()
    console.log(`[iter28] table rows: ${rows} (期待 30)`)
    if (rows < 25) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: `Backlog: 30 投入したが table rows=${rows} (rendering pagination?)`,
      })
    }
    await page.screenshot({ path: '/tmp/uiux-backlog-large-iter28.png', fullPage: true })
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
