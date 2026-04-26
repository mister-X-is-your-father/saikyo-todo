/**
 * Phase 6.15 loop iter 92 — Today / Inbox view の priority 色 dot に aria-label が
 * 付いているかを確認。現状は title のみ (mouse hover 専用) で SR から優先度が見えない懸念。
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
  const email = `iter92-${stamp}@example.com`
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
    ws_name: `iter92-${stamp}`,
    ws_slug: `iter92-${stamp}`,
  })
  const workspaceId = wsId as string

  const today = new Date().toISOString().slice(0, 10)
  // Today: priority 1, 4 / Inbox: priority 2 (no date)
  await admin.from('items').insert([
    {
      workspace_id: workspaceId,
      title: 'iter92 todayP1',
      due_date: today,
      priority: 1,
      status: 'todo',
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    },
    {
      workspace_id: workspaceId,
      title: 'iter92 todayP4',
      due_date: today,
      priority: 4,
      status: 'todo',
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    },
    {
      workspace_id: workspaceId,
      title: 'iter92 inboxP2',
      priority: 2,
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
  page.on('pageerror', (e) => {
    findings.push({ level: 'error', source: 'pageerror', message: e.message.slice(0, 240) })
  })

  try {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
    await page.locator('input#email').fill(email)
    await page.locator('input#password').fill(password)
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(`${BASE}/`, { timeout: 10_000 })

    // --- Today view ---
    await page.goto(`${BASE}/${workspaceId}?view=today`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    const todayDots = await page
      .locator('[data-testid="today-view"] [data-testid^="today-row-"] span[title^="p"]')
      .all()
    let todayWithAria = 0
    for (const d of todayDots) {
      const aria = await d.getAttribute('aria-label')
      if (aria) todayWithAria++
    }
    console.log(
      `[iter92] today priority dots: total=${todayDots.length} with-aria-label=${todayWithAria}`,
    )
    if (todayDots.length > 0 && todayWithAria === 0) {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message: 'Today view priority dot に aria-label なし (title のみ → SR から優先度不可視)',
      })
    }
    await page.screenshot({ path: '/tmp/uiux-priority-a11y-iter92-today.png' })

    // --- Inbox view ---
    await page.goto(`${BASE}/${workspaceId}?view=inbox`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    const inboxDots = await page
      .locator('[data-testid="inbox-view"] [data-testid^="inbox-row-"] span[title^="p"]')
      .all()
    let inboxWithAria = 0
    for (const d of inboxDots) {
      const aria = await d.getAttribute('aria-label')
      if (aria) inboxWithAria++
    }
    console.log(
      `[iter92] inbox priority dots: total=${inboxDots.length} with-aria-label=${inboxWithAria}`,
    )
    if (inboxDots.length > 0 && inboxWithAria === 0) {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message: 'Inbox view priority dot に aria-label なし (title のみ → SR から優先度不可視)',
      })
    }
    await page.screenshot({ path: '/tmp/uiux-priority-a11y-iter92-inbox.png' })
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
