/**
 * Phase 6.15 loop iter 95 — /goals KR 追加 form の Enter-to-submit 確認 + KR 進捗バー a11y。
 * 既存パターン (iter39-41 sprint/goal/template) と同症状: form 要素なしで Enter submit 不可。
 * KR progress bar も role="progressbar" 無し (iter91 で Goal/Sprint は対応済だが KR レベルは未対応)。
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
  const email = `iter95-${stamp}@example.com`
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
    ws_name: `iter95-${stamp}`,
    ws_slug: `iter95-${stamp}`,
  })
  const workspaceId = wsId as string

  // Goal を 1 件 seed (KR 追加 form を出すため)
  const today = new Date().toISOString().slice(0, 10)
  const endDate = new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10)
  const { data: goal } = await admin
    .from('goals')
    .insert({
      workspace_id: workspaceId,
      title: 'iter95 goal',
      description: 'iter95 KR test',
      period: 'quarterly',
      start_date: today,
      end_date: endDate,
      status: 'active',
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
    .select('id')
    .single()
  const goalId = goal!.id

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
    await page.waitForTimeout(1500)

    // toggle: open the goal card
    await page.locator(`[data-testid="goal-toggle-${goalId}"]`).click()
    await page.waitForTimeout(500)

    // Enter で submit 試行
    const krInput = page.locator(`[data-testid="kr-title-input-${goalId}"]`)
    await krInput.fill('iter95 KR via Enter')
    await krInput.press('Enter')
    await page.waitForTimeout(800)

    const krs = await page.locator(`[data-testid="krs-${goalId}"] > li`).count()
    console.log(`[iter95] KR count after Enter: ${krs}`)
    if (krs === 0) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: '/goals KR 追加 form: Enter キーで submit 不可 (form 要素なし)',
      })
    }

    // Mouse click でも試行
    if (krs === 0) {
      await page.locator(`[data-testid="kr-add-btn-${goalId}"]`).click()
      await page.waitForTimeout(800)
    }

    // KR progress bar の role="progressbar" 確認
    const progressBars = await page
      .locator(`[data-testid="krs-${goalId}"] [role="progressbar"]`)
      .count()
    const liItems = await page.locator(`[data-testid="krs-${goalId}"] > li`).count()
    console.log(`[iter95] KR list items=${liItems} progressbar role count=${progressBars}`)
    if (liItems > 0 && progressBars === 0) {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message: 'KR progress bar に role="progressbar" なし (SR で進捗が読み上げ不可)',
      })
    }

    // toggle button の aria-expanded
    const expanded = await page
      .locator(`[data-testid="goal-toggle-${goalId}"]`)
      .getAttribute('aria-expanded')
    console.log(`[iter95] goal-toggle aria-expanded=${JSON.stringify(expanded)}`)
    if (expanded === null) {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message: 'goal-toggle button に aria-expanded なし (disclosure pattern 不完全)',
      })
    }

    await page.screenshot({ path: '/tmp/uiux-goals-kr-iter95.png' })
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
