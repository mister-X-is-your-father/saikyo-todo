/**
 * Phase 6.15 loop iter 91 — Goal / Sprint progress bar に role=progressbar が
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
  const email = `iter91-${stamp}@example.com`
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
    ws_name: `iter91-${stamp}`,
    ws_slug: `iter91-${stamp}`,
  })
  const workspaceId = wsId as string

  const goalIns = await admin
    .from('goals')
    .insert({
      workspace_id: workspaceId,
      title: 'iter91 goal',
      start_date: '2026-04-01',
      end_date: '2026-06-30',
      status: 'active',
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
    .select('id')
    .single()
  const goalId = goalIns.data!.id

  const sprintIns = await admin
    .from('sprints')
    .insert({
      workspace_id: workspaceId,
      name: 'iter91 sprint',
      start_date: '2026-04-15',
      end_date: '2026-04-30',
      status: 'active',
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
    .select('id')
    .single()
  const sprintId = sprintIns.data!.id

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

    // Goal page
    await page.goto(`${BASE}/${workspaceId}/goals`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    const goalBar = page.locator(`[data-testid="goal-progress-${goalId}"]`)
    if ((await goalBar.count()) > 0) {
      const a = await goalBar.evaluate((el) => ({
        role: el.getAttribute('role'),
        valuemax: el.getAttribute('aria-valuemax'),
        label: el.getAttribute('aria-label'),
      }))
      console.log(`[iter91] goal bar:`, JSON.stringify(a))
      if (a.role !== 'progressbar') {
        findings.push({
          level: 'warning',
          source: 'a11y',
          message: 'goal progress bar に role=progressbar 抜け',
        })
      }
    }

    // Sprint page
    await page.goto(`${BASE}/${workspaceId}/sprints`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    const sprintBar = page.locator(`[data-testid="sprint-progress-${sprintId}"]`)
    if ((await sprintBar.count()) > 0) {
      const a = await sprintBar.evaluate((el) => ({
        role: el.getAttribute('role'),
        valuetext: el.getAttribute('aria-valuetext'),
      }))
      console.log(`[iter91] sprint bar:`, JSON.stringify(a))
      if (a.role !== 'progressbar') {
        findings.push({
          level: 'warning',
          source: 'a11y',
          message: 'sprint progress bar に role=progressbar 抜け',
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
