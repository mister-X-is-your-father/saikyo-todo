/**
 * Phase 6.15 loop iter 53 — ItemEditDialog の baseline クリア button 動作確認。
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
  const email = `iter53-${stamp}@example.com`
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
    ws_name: `iter53-${stamp}`,
    ws_slug: `iter53-${stamp}`,
  })
  const workspaceId = wsId as string

  const ins = await admin
    .from('items')
    .insert({
      workspace_id: workspaceId,
      title: 'iter53 has-baseline',
      start_date: '2026-05-01',
      due_date: '2026-05-10',
      baseline_start_date: '2026-05-01',
      baseline_end_date: '2026-05-10',
      baseline_taken_at: new Date().toISOString(),
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
  page.on('dialog', (d) => void d.accept()) // confirm() を OK
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
    await page.goto(`${BASE}/${workspaceId}?item=${itemId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    await page.screenshot({ path: '/tmp/uiux-baseline-clear-iter53-1.png', fullPage: true })

    const clearBtn = page.locator('[data-testid="item-edit-clear-baseline"]')
    const c = await clearBtn.count()
    console.log(`[iter53] clear button count: ${c}`)
    if (c === 0) {
      findings.push({
        level: 'error',
        source: 'observation',
        message: 'item-edit-clear-baseline button が描画されない',
      })
    } else {
      await clearBtn.click()
      await page.waitForTimeout(1500)

      const verify = await admin
        .from('items')
        .select('baseline_start_date, baseline_end_date, baseline_taken_at')
        .eq('id', itemId)
        .single()
      console.log('[iter53] DB after clear:', JSON.stringify(verify.data))
      if (verify.data?.baseline_start_date || verify.data?.baseline_end_date) {
        findings.push({
          level: 'error',
          source: 'observation',
          message: 'baseline clear 後も DB の baseline_* が残っている',
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
