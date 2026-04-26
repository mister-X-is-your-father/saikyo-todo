/**
 * Phase 6.15 loop iter 47 — items.baseline_* 列追加後にいつもの workspace 操作が
 * 落ちないか軽く確認 (regression smoke)。
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
  const email = `iter47-${stamp}@example.com`
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
    ws_name: `iter47-${stamp}`,
    ws_slug: `iter47-${stamp}`,
  })
  const workspaceId = wsId as string

  // baseline 列を直接 admin で書く (regression: 制約違反しないか)
  const ins = await admin
    .from('items')
    .insert({
      workspace_id: workspaceId,
      title: 'iter47 baseline test',
      start_date: '2026-05-01',
      due_date: '2026-05-10',
      baseline_start_date: '2026-05-01',
      baseline_end_date: '2026-05-08',
      baseline_taken_at: new Date().toISOString(),
      status: 'todo',
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
    .select('id, baseline_start_date, baseline_end_date')
    .single()
  console.log('[iter47] inserted with baseline:', JSON.stringify(ins.data ?? ins.error))

  // 制約違反: baseline_start_date のみ (片方だけ) は弾かれるはず
  const bad = await admin.from('items').insert({
    workspace_id: workspaceId,
    title: 'iter47 invalid baseline',
    baseline_start_date: '2026-05-01',
    // baseline_end_date 無し
    status: 'todo',
    created_by_actor_type: 'user',
    created_by_actor_id: userId,
  })
  if (!bad.error) {
    findings.push({
      level: 'error',
      source: 'observation',
      message: 'items_baseline_pair_check が効いていない (片方 NULL でも insert 成功)',
    })
  } else {
    console.log(`[iter47] expected check violation: ${bad.error.message?.slice(0, 100)}`)
  }

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
    await page.waitForTimeout(1500)
    await page.screenshot({ path: '/tmp/uiux-baseline-schema-iter47-1.png', fullPage: true })
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
