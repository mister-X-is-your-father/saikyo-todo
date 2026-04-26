/**
 * Phase 6.15 loop iter 98 — /pdca 「分布」バー (Plan/Do/Check/Act 4 セグメント) の a11y。
 * 各セグメントは title 属性のみで mouse hover 専用、SR からは比率が完全に不可視。
 */
import { chromium } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const BASE = 'http://localhost:3001'
const SUPABASE_URL = 'http://127.0.0.1:54321'

interface Finding {
  level: 'error' | 'warning' | 'info'
  source: 'console' | 'pageerror' | 'a11y' | 'observation'
  message: string
}

async function main() {
  const findings: Finding[] = []
  const stamp = Date.now()
  const email = `iter98-${stamp}@example.com`
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
    ws_name: `iter98-${stamp}`,
    ws_slug: `iter98-${stamp}`,
  })
  const workspaceId = wsId as string

  // Plan/Do/Check/Act 各バケットに item をシード (分布バー描画のため)
  const today = new Date().toISOString().slice(0, 10)
  const seven = new Date(Date.now() - 3 * 86400_000).toISOString()
  const items = [
    { title: 'iter98 plan a', status: 'todo', doneAt: null },
    { title: 'iter98 plan b', status: 'todo', doneAt: null },
    { title: 'iter98 do a', status: 'in_progress', doneAt: null },
    { title: 'iter98 check a', status: 'done', doneAt: seven },
    { title: 'iter98 check b', status: 'done', doneAt: seven },
  ]
  for (const it of items) {
    await admin.from('items').insert({
      workspace_id: workspaceId,
      title: it.title,
      due_date: today,
      status: it.status,
      done_at: it.doneAt,
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
  }

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

    await page.goto(`${BASE}/${workspaceId}/pdca`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)

    // 分布バー segments: title="Plan/Do/Check/Act" を持つ div
    const distSegments = await page
      .locator(
        '[data-testid="pdca-panel"] [title^="Plan"], [title^="Do"], [title^="Check"], [title^="Act"]',
      )
      .all()
    let segmentsWithRole = 0
    let segmentsWithAriaLabel = 0
    for (const seg of distSegments) {
      const role = await seg.getAttribute('role')
      const aria = await seg.getAttribute('aria-label')
      if (role) segmentsWithRole++
      if (aria) segmentsWithAriaLabel++
    }
    console.log(
      `[iter98] distribution segments: total=${distSegments.length} role=${segmentsWithRole} aria-label=${segmentsWithAriaLabel}`,
    )

    // container 自体が role=img を持っていれば aria-label が要約済 (segments は aria-hidden で OK)
    const distBar = page.locator('[data-testid="pdca-distribution-bar"]')
    const distRole = await distBar.getAttribute('role').catch(() => null)
    const distAria = await distBar.getAttribute('aria-label').catch(() => null)
    console.log(
      `[iter98] distribution bar container role=${JSON.stringify(distRole)} aria-label=${JSON.stringify(distAria?.slice(0, 60))}`,
    )
    if (distRole === null || !distAria) {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message: 'PDCA 分布バー container に role / aria-label なし (4 状態比率が SR に不可視)',
      })
    }
    if (distSegments.length > 0 && segmentsWithAriaLabel === 0 && distRole !== 'img') {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message:
          'PDCA 分布バー segments に aria-label / role なし (title のみ — SR で 4 状態の比率が不可視)',
      })
    }

    await page.screenshot({ path: '/tmp/uiux-pdca-distribution-iter98.png' })
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
