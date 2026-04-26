/**
 * Phase 6.15 loop iter 100 — Backlog table の sortable column header キーボード a11y。
 * onClick で sort toggle するが <th> は focusable でなく onKeyDown もないので
 * キーボード user は sort 操作不可。
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
  const email = `iter100-${stamp}@example.com`
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
    ws_name: `iter100-${stamp}`,
    ws_slug: `iter100-${stamp}`,
  })
  const workspaceId = wsId as string

  // Backlog seed (3 件)
  for (const t of ['iter100 a', 'iter100 b', 'iter100 c']) {
    await admin.from('items').insert({
      workspace_id: workspaceId,
      title: t,
      status: 'todo',
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
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

    await page.goto(`${BASE}/${workspaceId}?view=backlog`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    const sortableHeaders = await page.locator('th[aria-sort="none"]').all()
    let withTabIndex = 0
    let withRole = 0
    for (const th of sortableHeaders) {
      const ti = await th.getAttribute('tabindex')
      const role = await th.getAttribute('role')
      if (ti !== null) withTabIndex++
      if (role) withRole++
    }
    console.log(
      `[iter100] sortable th count=${sortableHeaders.length} with-tabindex=${withTabIndex} with-role=${withRole}`,
    )
    if (sortableHeaders.length > 0 && withTabIndex === 0) {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message: 'Backlog sortable <th> に tabindex なし (キーボード user は sort 操作不可)',
      })
    }

    // Try keyboard sort: focus first sortable th and press Enter/Space
    if (sortableHeaders.length > 0) {
      const firstTh = sortableHeaders[0]!
      await firstTh.focus().catch(() => {})
      await page.waitForTimeout(150)
      const focusedTag = await page.evaluate(() => document.activeElement?.tagName ?? null)
      console.log(`[iter100] focused tag after th.focus(): ${focusedTag}`)
      const sortedBefore = await page
        .locator('th[aria-sort="ascending"], th[aria-sort="descending"]')
        .count()
      await page.keyboard.press('Enter')
      await page.waitForTimeout(400)
      const sortedAfter = await page
        .locator('th[aria-sort="ascending"], th[aria-sort="descending"]')
        .count()
      console.log(`[iter100] sorted columns: before=${sortedBefore} after=${sortedAfter}`)
      if (sortedAfter <= sortedBefore) {
        findings.push({
          level: 'warning',
          source: 'a11y',
          message: 'Backlog th: Enter キーで sort 切替不可 (onKeyDown handler 無効)',
        })
      }
    }

    await page.screenshot({ path: '/tmp/uiux-backlog-sort-iter100.png' })
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
