/**
 * Phase 6.15 loop iter 108 — 個人 Daily/Weekly/Monthly view + ゴール (ユーザ要望)。
 * 「個人の週次、日次タスク、月次タスクを表示するモード。それぞれでのゴールを設定して表示」
 */
import { chromium } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const BASE = 'http://localhost:3001'
const SUPABASE_URL = 'http://127.0.0.1:54321'

interface Finding {
  level: 'error' | 'warning' | 'info'
  source: 'console' | 'pageerror' | 'observation'
  message: string
}

async function main() {
  const findings: Finding[] = []
  const stamp = Date.now()
  const email = `iter108-${stamp}@example.com`
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
    ws_name: `iter108-${stamp}`,
    ws_slug: `iter108-${stamp}`,
  })
  const workspaceId = wsId as string

  // 今日に dueDate が立った item を 2 件
  const today = new Date().toISOString().slice(0, 10)
  for (const t of ['iter108 today A', 'iter108 today B']) {
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

    // Daily view
    await page.goto(`${BASE}/${workspaceId}?view=daily`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    const dailyView = await page.locator('[data-testid="personal-period-view-day"]').count()
    const dailyItems = await page.locator('[data-testid^="period-row-day-"]').count()
    console.log(`[iter108] daily view exists=${dailyView} items=${dailyItems}`)

    // Goal を入力 → 保存
    await page.locator('[data-testid="period-goal-textarea-day"]').fill('iter108 daily ゴール')
    await page.locator('[data-testid="period-goal-save-day"]').click()
    await page.waitForTimeout(800)

    // reload して保存反映
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    const savedText = await page.locator('[data-testid="period-goal-textarea-day"]').inputValue()
    console.log(`[iter108] reloaded daily goal: ${JSON.stringify(savedText)}`)
    if (savedText !== 'iter108 daily ゴール') {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: `daily goal が永続化されていない (期待 "iter108 daily ゴール" 実際 ${JSON.stringify(savedText)})`,
      })
    }

    // Weekly / Monthly も view 切替確認
    await page.goto(`${BASE}/${workspaceId}?view=weekly`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    const weeklyView = await page.locator('[data-testid="personal-period-view-week"]').count()
    console.log(`[iter108] weekly view exists=${weeklyView}`)

    await page.goto(`${BASE}/${workspaceId}?view=monthly`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    const monthlyView = await page.locator('[data-testid="personal-period-view-month"]').count()
    console.log(`[iter108] monthly view exists=${monthlyView}`)

    if (!dailyView || !weeklyView || !monthlyView) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: '一部 period view が描画されていない',
      })
    }

    await page.screenshot({ path: '/tmp/uiux-period-views-iter108.png' })
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
