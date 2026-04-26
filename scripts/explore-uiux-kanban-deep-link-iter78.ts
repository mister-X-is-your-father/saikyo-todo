/**
 * Phase 6.15 loop iter 78 — Kanban view title click が ?item= deep link 経由で
 * dialog を開き、二重 rendering もないことを確認。
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
  const email = `iter78-${stamp}@example.com`
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
    ws_name: `iter78-${stamp}`,
    ws_slug: `iter78-${stamp}`,
  })
  const workspaceId = wsId as string

  const ins = await admin
    .from('items')
    .insert({
      workspace_id: workspaceId,
      title: 'iter78 kanban deep-link',
      status: 'todo',
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
    .select('id')
    .single()
  const itemId = ins.data!.id

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
    await page.goto(`${BASE}/${workspaceId}?view=kanban`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    await page.locator(`[data-testid="kanban-title-${itemId}"]`).click()
    await page.waitForTimeout(800)
    const url = page.url()
    console.log(`[iter78] url after click: ${url}`)
    if (!url.includes(`item=${itemId}`)) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: 'kanban title click 後も URL に item= が反映されない',
      })
    }
    const dialogCount = await page.locator('[data-testid="item-edit-dialog"]').count()
    console.log(`[iter78] dialog count: ${dialogCount}`)
    if (dialogCount !== 1) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: `dialog が ${dialogCount} 個 — duplicate rendering`,
      })
    }
    // refresh で復元
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    const dialogAfterReload = await page.locator('[data-testid="item-edit-dialog"]').count()
    console.log(`[iter78] dialog after reload: ${dialogAfterReload}`)
    if (dialogAfterReload !== 1) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: 'reload 後 dialog が復元されない (URL 駆動が効いていない)',
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
