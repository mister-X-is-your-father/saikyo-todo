/**
 * Phase 6.15 loop iter 17 — Kanban view を items 5 件投入して詳細探索。
 * status カラム / card hover / a11y / console error を観察。
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
  const email = `iter17-${stamp}@example.com`
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
    ws_name: `iter17-${stamp}`,
    ws_slug: `iter17-${stamp}`,
  })
  const workspaceId = wsId as string

  // 各 status の items を投入
  await admin.from('items').insert([
    {
      workspace_id: workspaceId,
      title: 'todo task 1',
      status: 'todo',
      priority: 1,
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    },
    {
      workspace_id: workspaceId,
      title: 'todo task 2 (MUST)',
      status: 'todo',
      is_must: true,
      dod: 'PASS',
      priority: 1,
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    },
    {
      workspace_id: workspaceId,
      title: 'in progress task',
      status: 'in_progress',
      priority: 2,
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    },
    {
      workspace_id: workspaceId,
      title: 'done task',
      status: 'done',
      priority: 3,
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    },
    {
      workspace_id: workspaceId,
      title: 'long title task with very long text that may overflow card',
      status: 'todo',
      priority: 4,
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

    // Kanban view tab を click
    const kanbanTab = page
      .locator('button:has-text("Kanban"), [role="tab"]:has-text("Kanban")')
      .first()
    await kanbanTab.click({ timeout: 3000 })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: '/tmp/uiux-kanban-iter17-1.png', fullPage: true })

    // status カラム / card 数を確認
    const cards = await page
      .locator('[data-testid^="kanban-card-"], [data-testid^="item-card-"]')
      .count()
    const columns = await page
      .locator('[data-testid^="kanban-column-"], [data-testid^="status-column-"]')
      .count()
    console.log(`[iter17] kanban: columns=${columns} cards=${cards}`)

    // status badge / MUST 表示確認
    const mustBadges = await page.locator('text=MUST').count()
    console.log(`[iter17] MUST badges visible: ${mustBadges}`)

    // hover 試験 — 1 つの card に hover して action button が visible になるか
    const firstCard = page.locator('[data-testid^="kanban-card-"]').first()
    if ((await firstCard.count()) > 0) {
      await firstCard.hover()
      await page.waitForTimeout(300)
      const decomposeBtn = await page.locator('[data-testid^="decompose-btn-"]').count()
      console.log(`[iter17] AI decompose buttons (after hover): ${decomposeBtn}`)
    }

    // checkbox click → 完了トグル
    const checkboxes = await page.locator('[role="checkbox"], input[type="checkbox"]').count()
    console.log(`[iter17] checkboxes: ${checkboxes}`)

    // QuickAdd input が visible (Kanban view 内)
    const quickAddInputs = await page
      .locator('input[placeholder*="今日" i], [data-testid*="quick-add" i]')
      .count()
    console.log(`[iter17] quickAdd inputs (kanban): ${quickAddInputs}`)
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
