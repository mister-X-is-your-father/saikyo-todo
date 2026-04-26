/**
 * Phase 6.15 loop iter 105 — Sprint 期間編集 UI 検証 (ユーザ要望)。
 * Sprint card の「期間」button → 開始日 / 終了日 input + 曜日表示 → 保存で sprint.startDate/endDate 更新。
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
  const email = `iter105-${stamp}@example.com`
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
    ws_name: `iter105-${stamp}`,
    ws_slug: `iter105-${stamp}`,
  })
  const workspaceId = wsId as string

  // Sprint を 1 件 seed (planning 状態)
  const today = new Date().toISOString().slice(0, 10)
  const { data: sprint } = await admin
    .from('sprints')
    .insert({
      workspace_id: workspaceId,
      name: 'iter105 sprint',
      start_date: today,
      end_date: new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10),
      status: 'planning',
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
    .select('id')
    .single()
  const sprintId = sprint!.id

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

    await page.goto(`${BASE}/${workspaceId}/sprints`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)

    // 1. period 表示に曜日が含まれているか
    const period = await page.locator(`[data-testid="sprint-period-${sprintId}"]`).textContent()
    console.log(`[iter105] period text: ${JSON.stringify(period)}`)
    if (!period || !/[\((][日月火水木金土][)\)]/.test(period)) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: '期間表示に曜日 (日/月/火/水/木/金/土) が含まれない',
      })
    }

    // 2. 期間編集 button を click → form が出る
    const editBtn = page.locator(`[data-testid="sprint-period-edit-btn-${sprintId}"]`)
    const editBtnExists = (await editBtn.count()) > 0
    console.log(`[iter105] period edit button exists=${editBtnExists}`)
    if (!editBtnExists) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: '「期間」編集ボタンが見つからない',
      })
    } else {
      await editBtn.click()
      await page.waitForTimeout(300)

      // 3. 新しい開始日 (今日 + 3 日) と終了日 (今日 + 14 日) に書き換え
      const newStart = new Date(Date.now() + 3 * 86400_000).toISOString().slice(0, 10)
      const newEnd = new Date(Date.now() + 14 * 86400_000).toISOString().slice(0, 10)
      await page.locator(`#sprint-edit-start-${sprintId}`).fill(newStart)
      await page.locator(`#sprint-edit-end-${sprintId}`).fill(newEnd)
      await page.locator(`[data-testid="sprint-period-save-${sprintId}"]`).click()
      await page.waitForTimeout(1500)

      const newPeriod = await page
        .locator(`[data-testid="sprint-period-${sprintId}"]`)
        .textContent()
      console.log(`[iter105] period after save: ${JSON.stringify(newPeriod)}`)
      if (!newPeriod?.includes(newStart) || !newPeriod?.includes(newEnd)) {
        findings.push({
          level: 'warning',
          source: 'observation',
          message: `保存後に新期間 ${newStart}〜${newEnd} が反映されていない`,
        })
      }
    }

    await page.screenshot({ path: '/tmp/uiux-sprint-period-edit-iter105.png' })
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
