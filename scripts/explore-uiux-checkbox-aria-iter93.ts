/**
 * Phase 6.15 loop iter 93 — ItemCheckbox の aria-label に item title が含まれているか確認。
 * Todoist/TickTick は SR が "<title> を完了" と読み上げるが、saikyo-todo は
 * "完了にする" のみで title 情報なし → SR で どの item の checkbox か判別不能。
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
  const email = `iter93-${stamp}@example.com`
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
    ws_name: `iter93-${stamp}`,
    ws_slug: `iter93-${stamp}`,
  })
  const workspaceId = wsId as string

  const today = new Date().toISOString().slice(0, 10)
  const titles = ['牛乳を買う', '本を返却', '会議準備']
  for (const t of titles) {
    await admin.from('items').insert({
      workspace_id: workspaceId,
      title: t,
      due_date: today,
      status: 'todo',
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

    await page.goto(`${BASE}/${workspaceId}?view=today`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    const checkboxes = await page.locator('[data-testid^="item-checkbox-"]').all()
    let withTitleInAria = 0
    const ariaLabels: string[] = []
    for (const cb of checkboxes) {
      const aria = (await cb.getAttribute('aria-label')) ?? ''
      ariaLabels.push(aria)
      if (titles.some((t) => aria.includes(t))) withTitleInAria++
    }
    console.log(
      `[iter93] today checkboxes: total=${checkboxes.length} with-title-in-aria=${withTitleInAria}`,
    )
    console.log(`[iter93] aria samples: ${JSON.stringify(ariaLabels.slice(0, 3))}`)

    if (checkboxes.length > 0 && withTitleInAria === 0) {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message:
          'ItemCheckbox の aria-label に item title が含まれない (SR で同じ「完了にする」が連続し item 識別不能)',
      })
    }
    await page.screenshot({ path: '/tmp/uiux-checkbox-aria-iter93.png' })
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
