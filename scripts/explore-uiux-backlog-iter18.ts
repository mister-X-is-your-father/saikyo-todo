/**
 * Phase 6.15 loop iter 18 — Backlog view 詳細探索 (items 5 件投入で sortable list 動作確認)。
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
  const email = `iter18-${stamp}@example.com`
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
    ws_name: `iter18-${stamp}`,
    ws_slug: `iter18-${stamp}`,
  })
  const workspaceId = wsId as string

  await admin.from('items').insert(
    Array.from({ length: 8 }, (_, i) => ({
      workspace_id: workspaceId,
      title: `backlog item ${i + 1}`,
      status: 'todo',
      priority: ((i % 4) + 1) as 1 | 2 | 3 | 4,
      is_must: i === 0,
      ...(i === 0 ? { dod: 'PASS' } : {}),
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })),
  )

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

    const backlogTab = page
      .locator('button:has-text("Backlog"), [role="tab"]:has-text("Backlog")')
      .first()
    await backlogTab.click({ timeout: 3000 })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: '/tmp/uiux-backlog-iter18-1.png', fullPage: true })

    // 行 (table-like) と sort header
    const rows = await page.locator('tr').count()
    const sortHeaders = await page.locator('thead th').count()
    console.log(`[iter18] backlog: rows=${rows} sort headers=${sortHeaders}`)

    // 8 items 投入したから、ヘッダ行 + 8 行 = 9 行期待
    if (rows < 8) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: `Backlog: 8 items 投入したが table 行数が ${rows} (ヘッダ含む)`,
      })
    }

    // ソート header click を試す (priority / title)
    const titleHeader = page
      .locator('thead th:has-text("タイトル"), thead th:has-text("Title")')
      .first()
    if ((await titleHeader.count()) > 0) {
      const t0 = Date.now()
      await titleHeader.click({ timeout: 1500 })
      await page.waitForTimeout(400)
      console.log(`[iter18] sort by title: ${Date.now() - t0}ms`)
    }

    // 各 item の checkbox を取得
    const checkboxes = await page.locator('input[type="checkbox"], [role="checkbox"]').count()
    console.log(`[iter18] checkboxes: ${checkboxes}`)

    // bulk-action-bar が表示されるか (1 つ check)
    if (checkboxes > 0) {
      const firstCheckbox = page.locator('input[type="checkbox"], [role="checkbox"]').first()
      if (await firstCheckbox.isVisible()) {
        await firstCheckbox.click({ timeout: 1500 }).catch(() => {})
        await page.waitForTimeout(400)
        const bulkBar = await page.locator('[data-testid*="bulk" i]').count()
        console.log(`[iter18] bulk-action-bar after check: ${bulkBar}`)
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
