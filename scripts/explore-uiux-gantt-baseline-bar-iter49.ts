/**
 * Phase 6.15 loop iter 49 — Gantt baseline bar が描画されることを確認。
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
  const email = `iter49-${stamp}@example.com`
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
    ws_name: `iter49-${stamp}`,
    ws_slug: `iter49-${stamp}`,
  })
  const workspaceId = wsId as string

  // baseline ありの item を 1 件 admin で投入
  const ins = await admin
    .from('items')
    .insert({
      workspace_id: workspaceId,
      title: 'iter49 baseline target',
      start_date: '2026-05-05',
      due_date: '2026-05-15',
      // baseline は当初計画 (実績よりちょっと早く終わる予定だった) を表す
      baseline_start_date: '2026-05-05',
      baseline_end_date: '2026-05-12',
      baseline_taken_at: new Date().toISOString(),
      status: 'todo',
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
    .select('id')
    .single()
  console.log('[iter49] inserted item:', JSON.stringify(ins.data ?? ins.error))

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
    await page.screenshot({ path: '/tmp/uiux-gantt-baseline-bar-iter49-1.png', fullPage: true })

    if (ins.data?.id) {
      const baseline = page.locator(`[data-testid="gantt-baseline-${ins.data.id}"]`)
      const count = await baseline.count()
      console.log(`[iter49] baseline bar count for inserted item: ${count}`)
      if (count === 0) {
        findings.push({
          level: 'error',
          source: 'observation',
          message: 'baseline_* が set されているが gantt-baseline-<id> bar が描画されていない',
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
