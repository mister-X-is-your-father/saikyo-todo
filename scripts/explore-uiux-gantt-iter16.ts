/**
 * Phase 6.15 loop iter 16 — Gantt today-line 表示再検証 + 詳細観察。
 *
 * iter15 で today-line が count=0 だった。
 * - items の date range に「今日」が確実に含まれるよう dynamically に作成
 * - Gantt view 切替後に十分待つ
 * - svg / today-line の DOM 状態を詳細出力
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
  const email = `iter16-${stamp}@example.com`
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
    ws_name: `iter16-${stamp}`,
    ws_slug: `iter16-${stamp}`,
  })
  const workspaceId = wsId as string

  // 「今日」を確実に範囲に含める items を投入 (今日 -3 〜 今日 +3)
  const today = new Date()
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const minus3 = new Date(today)
  minus3.setDate(minus3.getDate() - 3)
  const plus3 = new Date(today)
  plus3.setDate(plus3.getDate() + 3)
  await admin.from('items').insert([
    {
      workspace_id: workspaceId,
      title: 'past start, future end',
      status: 'in_progress',
      start_date: fmt(minus3),
      due_date: fmt(plus3),
      priority: 1,
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    },
  ])

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
  page.on('pageerror', (e) =>
    findings.push({ level: 'error', source: 'pageerror', message: String(e).slice(0, 240) }),
  )

  try {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
    await page.locator('input#email').fill(email)
    await page.locator('input#password').fill(password)
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(`${BASE}/`, { timeout: 10_000 })
    await page.goto(`${BASE}/${workspaceId}`, { waitUntil: 'networkidle' })

    // Gantt view tab を click
    const ganttTab = page
      .locator('button:has-text("Gantt"), [role="tab"]:has-text("Gantt")')
      .first()
    await ganttTab.click({ timeout: 3000 })
    // 十分待つ (gantt-view-with-deps の useWorkspaceBlocksDependencies fetch を含む)
    await page.waitForTimeout(2500)
    await page.screenshot({ path: '/tmp/uiux-gantt-iter16-1.png', fullPage: true })

    // gantt-view が存在するか
    const ganttView = await page.locator('[data-testid="gantt-view"]').count()
    console.log(`[iter16] gantt-view: ${ganttView}`)

    // bar 数
    const bars = await page.locator('[data-testid^="gantt-bar-"]').count()
    console.log(`[iter16] gantt bars: ${bars}`)

    // today-line
    const todayLine = await page.locator('[data-testid="gantt-today-line"]').count()
    console.log(`[iter16] today-line: ${todayLine}`)

    // weekend cells
    const weekend = await page.locator('[data-testid^="gantt-weekend-"]').count()
    console.log(`[iter16] weekend cells: ${weekend}`)

    if (bars > 0 && todayLine === 0) {
      findings.push({
        level: 'error',
        source: 'observation',
        message: `Gantt: items 1 件描画されたのに today-line 表示なし (range は今日±3 で確実に含むはず) — gantt-view-with-deps の hook 計算順序を要調査`,
      })
    } else if (todayLine > 0) {
      console.log('[iter16] ✓ today-line OK')
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
