/**
 * Phase 6.15 loop iter 56 — Dashboard view の AI cost table の th scope / caption を確認。
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
  const email = `iter56-${stamp}@example.com`
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
    ws_name: `iter56-${stamp}`,
    ws_slug: `iter56-${stamp}`,
  })
  const workspaceId = wsId as string

  // agent invocation cost を 1 件作って表に行を出す
  await admin.from('agent_runs').insert({
    workspace_id: workspaceId,
    role: 'researcher',
    status: 'completed',
    started_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
    input_tokens: 1000,
    output_tokens: 500,
    cost_usd: 0.0123,
  })

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
    await page.goto(`${BASE}/${workspaceId}?view=dashboard`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    await page.screenshot({ path: '/tmp/uiux-dashboard-table-iter56-1.png', fullPage: true })

    const table = page.locator('[data-testid="ai-cost-table"] table').first()
    if ((await table.count()) > 0) {
      const headers = await table
        .locator('th')
        .evaluateAll((els) =>
          els.map((el) => ({ scope: el.getAttribute('scope'), text: el.textContent?.trim() })),
        )
      console.log('[iter56] cost table headers:', JSON.stringify(headers))
      const missing = headers.filter((h) => !h.scope)
      if (missing.length > 0) {
        findings.push({
          level: 'warning',
          source: 'a11y',
          message: `dashboard ai-cost-table の <th> ${missing.length} 個に scope なし`,
        })
      }
      const captionCount = await table.locator('caption').count()
      if (captionCount === 0) {
        findings.push({
          level: 'info',
          source: 'a11y',
          message: 'dashboard ai-cost-table に <caption> なし',
        })
      }
    } else {
      console.log('[iter56] ai-cost-table が描画されない (cost data 取得 ok でない可能性)')
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
