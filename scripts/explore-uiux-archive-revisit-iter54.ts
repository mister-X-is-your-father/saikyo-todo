/**
 * Phase 6.15 loop iter 54 — /archive を再探索 (table の a11y / scope / caption 等)。
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
  const email = `iter54-${stamp}@example.com`
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
    ws_name: `iter54-${stamp}`,
    ws_slug: `iter54-${stamp}`,
  })
  const workspaceId = wsId as string

  const now = new Date()
  await admin.from('items').insert({
    workspace_id: workspaceId,
    title: 'iter54 archive sample',
    archived_at: now.toISOString(),
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
    await page.goto(`${BASE}/${workspaceId}/archive`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: '/tmp/uiux-archive-revisit-iter54-1.png', fullPage: true })

    const list = page.locator('[data-testid="archive-list"]')
    if ((await list.count()) > 0) {
      const headers = await page.locator('table th').evaluateAll((els) =>
        els.map((el) => ({
          scope: el.getAttribute('scope'),
          text: el.textContent?.trim(),
        })),
      )
      console.log('[iter54] archive table headers:', JSON.stringify(headers))
      const missingScope = headers.filter((h) => !h.scope)
      if (missingScope.length > 0) {
        findings.push({
          level: 'warning',
          source: 'a11y',
          message: `archive table の <th> ${missingScope.length} 個に scope 属性なし`,
        })
      }
      const caption = await page.locator('table caption').count()
      if (caption === 0) {
        findings.push({
          level: 'info',
          source: 'a11y',
          message: 'archive table に <caption> なし (SR で table 用途が伝わりにくい)',
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
