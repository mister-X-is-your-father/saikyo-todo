/**
 * Phase 6.15 loop iter 99 — Gantt bar / milestone のキーボード & SR a11y。
 * onClick で ItemEditDialog を開くがマウス専用 — role/aria-label/tabIndex/keyboard handler すべてなし。
 */
import { chromium } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const BASE = 'http://localhost:3001'
const SUPABASE_URL = 'http://127.0.0.1:54321'

interface Finding {
  level: 'error' | 'warning' | 'info'
  source: 'console' | 'pageerror' | 'a11y' | 'observation'
  message: string
}

async function main() {
  const findings: Finding[] = []
  const stamp = Date.now()
  const email = `iter99-${stamp}@example.com`
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
    ws_name: `iter99-${stamp}`,
    ws_slug: `iter99-${stamp}`,
  })
  const workspaceId = wsId as string

  const today = new Date()
  const tomorrow = new Date(Date.now() + 86400_000).toISOString().slice(0, 10)
  const todayStr = today.toISOString().slice(0, 10)
  // 通常 bar (3 日 span) と milestone (1 日完結)
  await admin.from('items').insert([
    {
      workspace_id: workspaceId,
      title: 'iter99 通常 bar',
      start_date: todayStr,
      due_date: new Date(Date.now() + 2 * 86400_000).toISOString().slice(0, 10),
      status: 'in_progress',
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    },
    {
      workspace_id: workspaceId,
      title: 'iter99 milestone',
      start_date: tomorrow,
      due_date: tomorrow,
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

    const bars = await page.locator('[data-testid^="gantt-bar-"]').all()
    let withRole = 0
    let withAria = 0
    let withTabIndex = 0
    for (const b of bars) {
      const role = await b.getAttribute('role')
      const aria = await b.getAttribute('aria-label')
      const ti = await b.getAttribute('tabindex')
      if (role) withRole++
      if (aria) withAria++
      if (ti !== null) withTabIndex++
    }
    console.log(
      `[iter99] gantt bars: total=${bars.length} role=${withRole} aria-label=${withAria} tabindex=${withTabIndex}`,
    )
    if (bars.length > 0 && (withRole === 0 || withAria === 0 || withTabIndex === 0)) {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message: `Gantt bar に role/aria-label/tabindex のいずれかが欠落 (キーボード+SR から ItemEditDialog 開けない)`,
      })
    }

    // Keyboard: Tab → first bar focus → Enter → dialog open?
    if (bars.length > 0) {
      await bars[0]!.focus().catch(() => {})
      await page.waitForTimeout(200)
      const focused = await page.evaluate(
        () => (document.activeElement as HTMLElement | null)?.getAttribute('data-testid') ?? null,
      )
      console.log(`[iter99] focused element: ${JSON.stringify(focused)}`)
      if (!focused?.startsWith('gantt-bar-')) {
        findings.push({
          level: 'warning',
          source: 'a11y',
          message: 'Gantt bar が programmatic focus を受け付けない (focusable でない)',
        })
      }
    }

    await page.screenshot({ path: '/tmp/uiux-gantt-bar-a11y-iter99.png' })
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
