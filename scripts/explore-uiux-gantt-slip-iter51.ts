/**
 * Phase 6.15 loop iter 51 — Gantt summary に baseline 件数 / slip (遅延) 件数 / 合計遅延日数 が
 * 出るか確認。baseline_end < due_date の item を 1 件投入して slip を起こす。
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
  const email = `iter51-${stamp}@example.com`
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
    ws_name: `iter51-${stamp}`,
    ws_slug: `iter51-${stamp}`,
  })
  const workspaceId = wsId as string

  // baseline=2026-05-01..05、actual=2026-05-01..08 (3 日遅延)
  await admin.from('items').insert({
    workspace_id: workspaceId,
    title: 'iter51 slip 3 days',
    start_date: '2026-05-01',
    due_date: '2026-05-08',
    baseline_start_date: '2026-05-01',
    baseline_end_date: '2026-05-05',
    baseline_taken_at: new Date().toISOString(),
    status: 'todo',
    created_by_actor_type: 'user',
    created_by_actor_id: userId,
  })

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
    await page.screenshot({ path: '/tmp/uiux-gantt-slip-iter51-1.png', fullPage: true })

    const baselineSpan = page.locator('[data-testid="gantt-summary-baseline"]')
    const slipSpan = page.locator('[data-testid="gantt-summary-slip"]')
    const baselineText =
      (await baselineSpan.count()) > 0 ? (await baselineSpan.textContent())?.trim() : '(none)'
    const slipText =
      (await slipSpan.count()) > 0 ? (await slipSpan.textContent())?.trim() : '(none)'
    console.log(`[iter51] baseline span: ${baselineText}`)
    console.log(`[iter51] slip span: ${slipText}`)
    if (!slipText?.includes('3')) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: `slip 表示に 3 日が含まれない (実際: ${slipText})`,
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
