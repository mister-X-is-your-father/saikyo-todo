/**
 * Phase 6.15 loop iter 33 — Goal 作成 → KR (Key Result) 追加 form を探索。
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
  const email = `iter33-${stamp}@example.com`
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
    ws_name: `iter33-${stamp}`,
    ws_slug: `iter33-${stamp}`,
  })
  const workspaceId = wsId as string

  // goal を直接 admin で作る
  const { data: goalRow } = await admin
    .from('goals')
    .insert({
      workspace_id: workspaceId,
      title: 'iter33 goal',
      start_date: '2026-04-01',
      end_date: '2026-06-30',
      status: 'active',
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
    .select('id')
    .single()
  console.log(`[iter33] goal created: ${goalRow?.id}`)

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
    await page.goto(`${BASE}/${workspaceId}/goals`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2500)
    await page.screenshot({ path: '/tmp/uiux-goal-kr-iter33-1.png', fullPage: true })

    // goal 行を expand する button (アイコン or chevron)
    const expandBtn = page
      .locator(
        'button:has-text("KR"), button:has-text("展開"), [data-testid*="goal-expand"], [aria-label*="展開" i], [aria-label*="expand" i]',
      )
      .first()
    const c = await expandBtn.count()
    console.log(`[iter33] goal expand button candidates: ${c}`)

    // KR form の input を観察
    const krInputs = await page.locator('input[id*="kr-"]').count()
    console.log(`[iter33] kr-* input count: ${krInputs}`)
    if (krInputs > 0) {
      // 各 kr input の required 属性を確認
      const ids = await page.locator('input[id*="kr-"]').evaluateAll((els) =>
        els.map((el) => ({
          id: el.getAttribute('id'),
          required: el.hasAttribute('required'),
          type: el.getAttribute('type'),
        })),
      )
      console.log('[iter33] kr inputs:', JSON.stringify(ids))
      for (const i of ids) {
        if (i.id?.toLowerCase().includes('title') && !i.required) {
          findings.push({
            level: 'warning',
            source: 'a11y',
            message: `KR form: input#${i.id} に required なし`,
          })
        }
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
