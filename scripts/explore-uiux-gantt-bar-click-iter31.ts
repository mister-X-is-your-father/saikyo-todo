/**
 * Phase 6.15 loop iter 31 — Gantt bar click で ItemEditDialog が開くか確認 (TeamGantt 比較項目)。
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
  const email = `iter31-${stamp}@example.com`
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
    ws_name: `iter31-${stamp}`,
    ws_slug: `iter31-${stamp}`,
  })
  const workspaceId = wsId as string

  const today = new Date()
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const minus2 = new Date(today)
  minus2.setDate(minus2.getDate() - 2)
  const plus2 = new Date(today)
  plus2.setDate(plus2.getDate() + 2)
  await admin
    .from('items')
    .insert([
      {
        workspace_id: workspaceId,
        title: 'iter31 gantt task',
        status: 'in_progress',
        start_date: fmt(minus2),
        due_date: fmt(plus2),
        priority: 1,
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
    await page.goto(`${BASE}/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2500)

    await page
      .locator('button:has-text("Gantt"), [role="tab"]:has-text("Gantt")')
      .first()
      .click({ timeout: 1500 })
    await page.waitForTimeout(2000)

    // bar click で ItemEditDialog が開くか
    const bar = page.locator('[data-testid^="gantt-bar-"]').first()
    const barCount = await bar.count()
    console.log(`[iter31] gantt bars: ${barCount}`)
    if (barCount === 0) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: 'Gantt: bar が見つからない (range 計算 or items 取得問題?)',
      })
    } else {
      await bar.click({ timeout: 1500 }).catch(() => {})
      await page.waitForTimeout(700)
      const dialog = await page.locator('[data-testid="item-edit-dialog"]').count()
      console.log(`[iter31] gantt bar click → dialog: ${dialog}`)
      if (dialog === 0) {
        findings.push({
          level: 'warning',
          source: 'observation',
          message: 'Gantt bar click で ItemEditDialog が開かない (TeamGantt の典型 UX が抜け)',
        })
      }
      await page.screenshot({ path: '/tmp/uiux-gantt-bar-click-iter31.png', fullPage: true })
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
