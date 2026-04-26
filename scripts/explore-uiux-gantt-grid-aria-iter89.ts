/**
 * Phase 6.15 loop iter 89 — Gantt に role=grid + aria-rowcount/aria-rowindex が
 * 付くか確認。
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
  const email = `iter89-${stamp}@example.com`
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
    ws_name: `iter89-${stamp}`,
    ws_slug: `iter89-${stamp}`,
  })
  const workspaceId = wsId as string

  await admin.from('items').insert([
    {
      workspace_id: workspaceId,
      title: 'iter89 A',
      start_date: '2026-05-01',
      due_date: '2026-05-05',
      status: 'todo',
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    },
    {
      workspace_id: workspaceId,
      title: 'iter89 B',
      start_date: '2026-05-08',
      due_date: '2026-05-12',
      status: 'todo',
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    },
  ])

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
    await page.goto(`${BASE}/${workspaceId}?view=gantt`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    const grid = page.locator('[data-testid="gantt-view"]')
    const role = await grid.evaluate((el) => el.getAttribute('role'))
    const rowCount = await grid.evaluate((el) => el.getAttribute('aria-rowcount'))
    console.log(`[iter89] role=${role} aria-rowcount=${rowCount}`)
    if (role !== 'grid') {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message: 'gantt-view に role="grid" が付いていない',
      })
    }
    if (rowCount !== '3') {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message: `aria-rowcount が想定外 (期待 3, 実 ${rowCount})`,
      })
    }
    const rows = await page
      .locator('[data-testid^="gantt-row-"][role="row"]')
      .evaluateAll((els) => els.map((el) => el.getAttribute('aria-rowindex')))
    console.log(`[iter89] row aria-rowindex: ${JSON.stringify(rows)}`)
    if (rows.join(',') !== '2,3') {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message: `aria-rowindex 並びが想定外 (期待 2,3、実 ${rows.join(',')})`,
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
