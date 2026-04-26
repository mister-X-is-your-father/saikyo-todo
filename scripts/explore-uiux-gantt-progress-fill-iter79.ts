/**
 * Phase 6.15 loop iter 79 — Gantt bar 内 progress fill が status に応じて出るか確認。
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
  const email = `iter79-${stamp}@example.com`
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
    ws_name: `iter79-${stamp}`,
    ws_slug: `iter79-${stamp}`,
  })
  const workspaceId = wsId as string

  const insTodo = await admin
    .from('items')
    .insert({
      workspace_id: workspaceId,
      title: 'iter79 todo (no progress fill)',
      start_date: '2026-04-25',
      due_date: '2026-04-30',
      status: 'todo',
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
    .select('id')
    .single()
  const insIp = await admin
    .from('items')
    .insert({
      workspace_id: workspaceId,
      title: 'iter79 in_progress',
      start_date: '2026-04-25',
      due_date: '2026-04-30',
      status: 'in_progress',
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
    .select('id')
    .single()

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
    await page.screenshot({ path: '/tmp/uiux-gantt-progress-fill-iter79-1.png', fullPage: true })

    const todoFill = await page
      .locator(`[data-testid="gantt-progress-${insTodo.data?.id}"]`)
      .count()
    const ipFill = await page.locator(`[data-testid="gantt-progress-${insIp.data?.id}"]`).count()
    console.log(`[iter79] todo bar progress fill count: ${todoFill}`)
    console.log(`[iter79] in_progress bar progress fill count: ${ipFill}`)
    if (todoFill !== 0) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: 'todo bar に progress fill が出ている (期待 0)',
      })
    }
    if (ipFill !== 1) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: 'in_progress bar に progress fill が無い (期待 1)',
      })
    }
    // in_progress fill の幅は親 bar の 50%
    if (ipFill === 1) {
      const w = await page
        .locator(`[data-testid="gantt-progress-${insIp.data?.id}"]`)
        .evaluate((el) => {
          const parent = el.parentElement!
          const pw = parent.getBoundingClientRect().width
          const sw = el.getBoundingClientRect().width
          return { pw, sw, pct: Math.round((sw / pw) * 100) }
        })
      console.log(`[iter79] in_progress fill width: ${JSON.stringify(w)}`)
      if (Math.abs(w.pct - 50) > 2) {
        findings.push({
          level: 'warning',
          source: 'observation',
          message: `in_progress fill 幅が 50% でない (実: ${w.pct}%)`,
        })
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
