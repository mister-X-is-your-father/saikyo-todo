/**
 * Phase 6.15 loop iter 15 — items-board の view 切替時に console error / 遅延が無いか観察。
 * items 1 件投入 → Today/Inbox/Kanban/Backlog/Gantt/Dashboard を順に切り替える。
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
  const email = `iter15-${stamp}@example.com`
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
    ws_name: `iter15-${stamp}`,
    ws_slug: `iter15-${stamp}`,
  })
  const workspaceId = wsId as string

  // items 2 件投入 (start/due 付き → Gantt 棒が表示される)
  await admin.from('items').insert([
    {
      workspace_id: workspaceId,
      title: 'iter15 task A',
      status: 'todo',
      start_date: '2026-04-25',
      due_date: '2026-04-28',
      priority: 1,
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    },
    {
      workspace_id: workspaceId,
      title: 'iter15 task B',
      status: 'in_progress',
      start_date: '2026-04-26',
      due_date: '2026-04-30',
      priority: 2,
      is_must: true,
      dod: 'PASS',
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

    const views = ['Today', 'Inbox', 'Kanban', 'Backlog', 'Gantt', 'Dashboard']
    for (const v of views) {
      const t0 = Date.now()
      const tab = page.locator(`button:has-text("${v}"), [role="tab"]:has-text("${v}")`).first()
      if ((await tab.count()) === 0) {
        findings.push({
          level: 'warning',
          source: 'observation',
          message: `view "${v}" tab not found`,
        })
        continue
      }
      await tab.click({ timeout: 2000 }).catch(() => {})
      await page.waitForTimeout(500)
      const elapsed = Date.now() - t0
      console.log(`[iter15] view ${v}: ${elapsed}ms`)
      await page.screenshot({ path: `/tmp/uiux-views-iter15-${v.toLowerCase()}.png` })
      if (elapsed > 4000) {
        findings.push({
          level: 'warning',
          source: 'observation',
          message: `view "${v}" 切替が ${elapsed}ms と遅い (dev compile?)`,
        })
      }
      // Gantt の場合は今 iter で実装した Today line / weekend が表示されるか確認
      if (v === 'Gantt') {
        const todayLine = await page.locator('[data-testid="gantt-today-line"]').count()
        const weekendCells = await page.locator('[data-testid^="gantt-weekend-"]').count()
        console.log(`[iter15] gantt today-line=${todayLine} weekend cells=${weekendCells}`)
        if (todayLine === 0) {
          findings.push({
            level: 'warning',
            source: 'observation',
            message: 'Gantt: today-line が 表示されていない (range 範囲外?)',
          })
        }
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
