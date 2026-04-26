/**
 * Phase 6.15 loop iter 80 — Dashboard StatCard の aria-label に tone (要対応/注意) が
 * 含まれることを確認。期限超過 item で danger tone を出す。
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
  const email = `iter80-${stamp}@example.com`
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
    ws_name: `iter80-${stamp}`,
    ws_slug: `iter80-${stamp}`,
  })
  const workspaceId = wsId as string

  // 期限超過 MUST item を 1 件投入 (overdue tone=danger になる)
  await admin.from('items').insert({
    workspace_id: workspaceId,
    title: 'iter80 overdue must',
    is_must: true,
    dod: 'iter80 dod',
    due_date: '2026-01-01',
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
    await page.goto(`${BASE}/${workspaceId}?view=dashboard`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    const danger = page.locator('[data-testid="stat-card-danger"]').first()
    if ((await danger.count()) === 0) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: 'danger tone の stat card が描画されない',
      })
    } else {
      const a = await danger.evaluate((el) => el.getAttribute('aria-label'))
      console.log(`[iter80] danger card aria-label: ${a}`)
      if (!a?.includes('要対応')) {
        findings.push({
          level: 'warning',
          source: 'a11y',
          message: 'danger tone の aria-label に "要対応" が含まれない',
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
