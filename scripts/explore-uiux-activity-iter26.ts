/**
 * Phase 6.15 loop iter 26 — ItemEditDialog の activity tab 軽探索 (新規 tab 確認)。
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
  const email = `iter26-${stamp}@example.com`
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
    ws_name: `iter26-${stamp}`,
    ws_slug: `iter26-${stamp}`,
  })
  const workspaceId = wsId as string

  const { data: itemRow } = await admin
    .from('items')
    .insert({
      workspace_id: workspaceId,
      title: 'iter26 target',
      status: 'todo',
      scheduled_for: new Date().toISOString().slice(0, 10),
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
    .select('id')
    .single()
  const itemId = itemRow!.id as string

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
    await page.goto(`${BASE}/${workspaceId}?item=${itemId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    // Activity tab に切替
    const actTab = page.locator('[data-testid="tab-activity"]').first()
    if ((await actTab.count()) > 0) {
      const t0 = Date.now()
      await actTab.click({ timeout: 1500 })
      await page.waitForTimeout(800)
      console.log(`[iter26] activity tab open: ${Date.now() - t0}ms`)
      await page.screenshot({ path: '/tmp/uiux-activity-iter26-1.png', fullPage: true })

      // create イベントが activity log に表示されるか
      const createLog = await page.locator('text=create').count()
      console.log(`[iter26] activity log "create" mentions: ${createLog}`)
    } else {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: 'tab-activity が存在しない',
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
