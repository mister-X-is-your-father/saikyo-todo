/**
 * Phase 6.15 loop iter 50 — ItemEditDialog のベースライン記録 button の動作確認。
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
  const email = `iter50-${stamp}@example.com`
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
    ws_name: `iter50-${stamp}`,
    ws_slug: `iter50-${stamp}`,
  })
  const workspaceId = wsId as string

  const ins = await admin
    .from('items')
    .insert({
      workspace_id: workspaceId,
      title: 'iter50 baseline target',
      start_date: '2026-05-05',
      due_date: '2026-05-15',
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
    // Deep link で edit dialog を開く
    await page.goto(`${BASE}/${workspaceId}?item=${itemId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    await page.screenshot({ path: '/tmp/uiux-baseline-button-iter50-1.png', fullPage: true })

    const btn = page.locator('[data-testid="item-edit-set-baseline"]')
    const c = await btn.count()
    console.log(`[iter50] set-baseline button count: ${c}`)
    if (c === 0) {
      findings.push({
        level: 'error',
        source: 'observation',
        message: 'item-edit-set-baseline button が描画されない (dialog 開かない or condition fail)',
      })
    } else {
      const labelBefore = await btn.textContent()
      console.log(`[iter50] label before click: ${labelBefore?.trim()}`)
      await btn.click()
      await page.waitForTimeout(1500)
      const toast = (await page.locator('[role="status"], .sonner-toast').allTextContents()).join(
        ' / ',
      )
      console.log(`[iter50] toast: ${toast.slice(0, 120)}`)
      if (!toast.includes('ベースライン')) {
        findings.push({
          level: 'warning',
          source: 'observation',
          message: 'set-baseline click 後も "ベースライン" を含む toast が出ない',
        })
      }

      // DB で baseline_start/end が埋まっているか
      const verify = await admin
        .from('items')
        .select('baseline_start_date, baseline_end_date, baseline_taken_at')
        .eq('id', itemId)
        .single()
      console.log('[iter50] DB after click:', JSON.stringify(verify.data))
      if (!verify.data?.baseline_start_date || !verify.data?.baseline_end_date) {
        findings.push({
          level: 'error',
          source: 'observation',
          message: 'baseline button click 後も DB の baseline_* が埋まっていない',
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
