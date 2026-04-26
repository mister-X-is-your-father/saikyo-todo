/**
 * Phase 6.15 loop iter 60 — Gantt の "今日へジャンプ" button 動作確認。
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
  const email = `iter60-${stamp}@example.com`
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
    ws_name: `iter60-${stamp}`,
    ws_slug: `iter60-${stamp}`,
  })
  const workspaceId = wsId as string

  // 今日を真ん中に挟むレンジ (today=2026-04-27 想定なので 04-15 〜 05-15)
  await admin.from('items').insert([
    {
      workspace_id: workspaceId,
      title: 'iter60 early',
      start_date: '2026-04-15',
      due_date: '2026-04-20',
      status: 'todo',
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    },
    {
      workspace_id: workspaceId,
      title: 'iter60 late',
      start_date: '2026-05-10',
      due_date: '2026-05-15',
      status: 'todo',
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    },
  ])

  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 800 } })
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

    const btn = page.locator('[data-testid="gantt-jump-today"]')
    const has = (await btn.count()) > 0
    console.log(`[iter60] jump-today button present: ${has}`)
    if (!has) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: 'gantt-jump-today button が描画されない (todayX が range 外?)',
      })
    } else {
      const before = await page
        .locator('[data-testid="gantt-view"]')
        .evaluate((el) => el.scrollLeft)
      console.log(`[iter60] scrollLeft before: ${before}`)
      await btn.click()
      await page.waitForTimeout(800)
      const after = await page.locator('[data-testid="gantt-view"]').evaluate((el) => el.scrollLeft)
      console.log(`[iter60] scrollLeft after: ${after}`)
      if (after === before) {
        findings.push({
          level: 'warning',
          source: 'observation',
          message: 'jump-today click 後も scrollLeft が変わらない',
        })
      }
    }
    await page.screenshot({ path: '/tmp/uiux-gantt-jump-today-iter60-1.png', fullPage: true })
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
