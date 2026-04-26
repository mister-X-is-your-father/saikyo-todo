/**
 * Phase 6.15 loop iter 46 — Gantt 表示で project 全体の期間 / critical 数を summary
 * banner で出すべき (TeamGantt 等の典型 UX) ことを確認するための探索。
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
  const email = `iter46-${stamp}@example.com`
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
    ws_name: `iter46-${stamp}`,
    ws_slug: `iter46-${stamp}`,
  })
  const workspaceId = wsId as string

  // 期間付き item を 3 件 admin で投入
  await admin.from('items').insert([
    {
      workspace_id: workspaceId,
      title: 'iter46 A',
      start_date: '2026-05-01',
      due_date: '2026-05-07',
      status: 'todo',
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    },
    {
      workspace_id: workspaceId,
      title: 'iter46 B',
      start_date: '2026-05-08',
      due_date: '2026-05-14',
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
    await page.waitForTimeout(2500)
    await page.screenshot({ path: '/tmp/uiux-gantt-summary-iter46-1.png', fullPage: true })

    const ganttView = page.locator('[data-testid="gantt-view"]')
    if ((await ganttView.count()) > 0) {
      const summary = page.locator('[data-testid="gantt-summary"]')
      const has = (await summary.count()) > 0
      console.log(`[iter46] gantt-summary present: ${has}`)
      if (!has) {
        findings.push({
          level: 'info',
          source: 'observation',
          message: 'Gantt: project duration / critical path 数を表示する summary banner なし',
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
