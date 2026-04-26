/**
 * Phase 6.15 loop iter 101 — Kanban view の column / card a11y。
 * Column は単なる <div> で role/aria-labelledby なし → SR で「列」として認識されず。
 * Column header h3 と件数 span が独立していて関連が SR に伝わらない。
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
  const email = `iter101-${stamp}@example.com`
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
    ws_name: `iter101-${stamp}`,
    ws_slug: `iter101-${stamp}`,
  })
  const workspaceId = wsId as string

  // 各 status に items を 2-3 件ずつ
  const seed = [
    { title: 'iter101 todo a', status: 'todo' },
    { title: 'iter101 todo b', status: 'todo' },
    { title: 'iter101 in_progress a', status: 'in_progress' },
    { title: 'iter101 done a', status: 'done' },
  ]
  for (const it of seed) {
    await admin.from('items').insert({
      workspace_id: workspaceId,
      title: it.title,
      status: it.status,
      done_at: it.status === 'done' ? new Date().toISOString() : null,
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

    await page.goto(`${BASE}/${workspaceId}?view=kanban`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    // Column の role + aria-labelledby
    const cols = await page.locator('[data-testid^="kanban-column-"]').all()
    let withRole = 0
    let withLabelledBy = 0
    let asSection = 0
    for (const c of cols) {
      const role = await c.getAttribute('role')
      const lb = await c.getAttribute('aria-labelledby')
      const aria = await c.getAttribute('aria-label')
      const tag = await c.evaluate((el) => el.tagName)
      if (role) withRole++
      if (lb || aria) withLabelledBy++
      if (tag === 'SECTION') asSection++
    }
    console.log(
      `[iter101] kanban columns: total=${cols.length} role=${withRole} labelled=${withLabelledBy} as<section>=${asSection}`,
    )
    // <section> with aria-labelledby は implicit role="region" の landmark なので OK
    const isLandmark = withLabelledBy === cols.length && (asSection === cols.length || withRole > 0)
    if (cols.length > 0 && !isLandmark) {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message:
          'Kanban column に role / aria-label なし (SR で「列」として landmark navigation 不可)',
      })
    }

    // board 自体の役割
    const board = page.locator('[data-testid="kanban-board"]')
    const boardRole = await board.getAttribute('role')
    const boardAria = await board.getAttribute('aria-label')
    console.log(
      `[iter101] kanban board role=${JSON.stringify(boardRole)} aria-label=${JSON.stringify(boardAria)}`,
    )
    if (!boardRole && !boardAria) {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message: 'kanban-board に role / aria-label なし (Board landmark 不在)',
      })
    }

    await page.screenshot({ path: '/tmp/uiux-kanban-a11y-iter101.png' })
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
