/**
 * Phase 6.15 loop iter 57 — Backlog view (TanStack Table) の th scope / aria-sort 確認。
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
  const email = `iter57-${stamp}@example.com`
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
    ws_name: `iter57-${stamp}`,
    ws_slug: `iter57-${stamp}`,
  })
  const workspaceId = wsId as string

  await admin.from('items').insert({
    workspace_id: workspaceId,
    title: 'iter57 backlog item',
    status: 'todo',
    created_by_actor_type: 'user',
    created_by_actor_id: userId,
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
    await page.goto(`${BASE}/${workspaceId}?view=backlog`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    await page.screenshot({ path: '/tmp/uiux-backlog-table-iter57-1.png', fullPage: true })

    const table = page.locator('[data-testid="backlog-view"] table').first()
    if ((await table.count()) > 0) {
      const headers = await table.locator('th').evaluateAll((els) =>
        els.map((el) => ({
          scope: el.getAttribute('scope'),
          ariaSort: el.getAttribute('aria-sort'),
          text: el.textContent?.trim().slice(0, 40),
        })),
      )
      console.log('[iter57] backlog headers:')
      for (const h of headers) console.log('  -', JSON.stringify(h))
      const missing = headers.filter((h) => !h.scope)
      if (missing.length > 0) {
        findings.push({
          level: 'warning',
          source: 'a11y',
          message: `backlog table の <th> ${missing.length} 個に scope なし`,
        })
      }
      const captionCount = await table.locator('caption').count()
      if (captionCount === 0) {
        findings.push({
          level: 'info',
          source: 'a11y',
          message: 'backlog table に <caption> なし',
        })
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
