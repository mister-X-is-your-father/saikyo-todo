/**
 * Phase 6.15 loop iter 110 — Sprint workspace デフォルト編集 UI (ユーザ要望)。
 * 「デフォルトが編集できたり、特例でこのスプリントだけ X月Y日から…」のうち
 * デフォルト編集側を実装。/sprints 画面に inline editor を出す。
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
  const email = `iter110-${stamp}@example.com`
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
    ws_name: `iter110-${stamp}`,
    ws_slug: `iter110-${stamp}`,
  })
  const workspaceId = wsId as string

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

    // 1. summary に既定 (月曜開始 / 14 日) が表示
    const summary = await page.locator('[data-testid="sprint-defaults-summary"]').textContent()
    console.log(`[iter110] defaults summary: ${JSON.stringify(summary)}`)
    if (!summary?.includes('月曜開始') || !summary?.includes('14 日')) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: `既定の summary に「月曜開始 / 14 日」が出ていない (${summary})`,
      })
    }

    // 2. 編集 button → 金曜開始 / 7 日 に変更
    await page.locator('[data-testid="sprint-defaults-edit-btn"]').click()
    await page.waitForTimeout(300)
    await page.locator('[data-testid="sprint-defaults-dow"]').selectOption('5')
    await page.locator('[data-testid="sprint-defaults-length"]').fill('7')
    await page.locator('[data-testid="sprint-defaults-save-btn"]').click()
    await page.waitForTimeout(800)

    // reload で永続化確認
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    const summary2 = await page.locator('[data-testid="sprint-defaults-summary"]').textContent()
    console.log(`[iter110] after save & reload: ${JSON.stringify(summary2)}`)
    if (!summary2?.includes('金曜開始') || !summary2?.includes('7 日')) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: `更新が永続化されていない (期待 金曜開始 / 7 日、実際 ${summary2})`,
      })
    }

    // 3. 新規 Sprint form の startDate も追従しているか (5 = 金曜)
    const startVal = await page.locator('input#sprint-start').inputValue()
    const startDate = new Date(startVal + 'T00:00:00')
    console.log(`[iter110] sprint-start initial value: ${startVal} (${startDate.getDay()})`)
    if (startDate.getDay() !== 5) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: `新規 form の startDate が金曜になっていない (dow=${startDate.getDay()})`,
      })
    }

    await page.screenshot({ path: '/tmp/uiux-sprint-defaults-iter110.png' })
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
