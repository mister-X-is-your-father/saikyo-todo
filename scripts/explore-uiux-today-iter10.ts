/**
 * Phase 6.15 loop iter 10 — workspace デフォルト view (Today 期待) + items-board の探索。
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
  const email = `iter10-${stamp}@example.com`
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
    ws_name: `iter10-${stamp}`,
    ws_slug: `iter10-${stamp}`,
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
  page.on('pageerror', (e) =>
    findings.push({ level: 'error', source: 'pageerror', message: String(e).slice(0, 240) }),
  )
  page.on('response', (res) => {
    if (res.status() >= 500)
      findings.push({
        level: 'error',
        source: 'network',
        message: `${res.status()} ${res.url().slice(0, 120)}`,
      })
  })

  try {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
    await page.locator('input#email').fill(email)
    await page.locator('input#password').fill(password)
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(`${BASE}/`, { timeout: 10_000 })
    await page.goto(`${BASE}/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.screenshot({ path: '/tmp/uiux-today-iter10-1-default.png', fullPage: true })

    const headings = await page.locator('h1, h2, h3').allTextContents()
    const buttons = await page.locator('button').count()
    const inputs = await page.locator('input').count()
    console.log(`[iter10] /<wsId> headings=${JSON.stringify(headings.slice(0, 5))}`)
    console.log(`[iter10] /<wsId> inputs=${inputs} buttons=${buttons}`)

    // QuickAdd input が見つかるか
    const quickAdd = page.locator(
      'input[placeholder*="今日" i], input[placeholder*="クイック" i], input[data-testid*="quick" i]',
    )
    const qaCount = await quickAdd.count()
    console.log(`[iter10] quickAdd matches: ${qaCount}`)

    // view 切替ボタン (Today/Inbox/Kanban/Backlog/Gantt/Dashboard)
    for (const label of ['Today', 'Inbox', 'Kanban', 'Backlog', 'Gantt', 'Dashboard']) {
      const c = await page
        .locator(`button:has-text("${label}"), [role="tab"]:has-text("${label}")`)
        .count()
      if (c === 0) {
        findings.push({
          level: 'warning',
          source: 'observation',
          message: `view 切替ボタン "${label}" が見つからない`,
        })
      }
    }

    // Gantt view を開いて Today 縦線が見えるか確認 (今 iter で実装する基準点)
    const ganttTab = page
      .locator('button:has-text("Gantt"), [role="tab"]:has-text("Gantt")')
      .first()
    if ((await ganttTab.count()) > 0) {
      await ganttTab.click()
      await page.waitForTimeout(800)
      await page.screenshot({ path: '/tmp/uiux-today-iter10-2-gantt.png', fullPage: true })
      const todayMarker = await page.locator('[data-testid="gantt-today-line"]').count()
      console.log(`[iter10] gantt today-line element: ${todayMarker}`)
      if (todayMarker === 0) {
        findings.push({
          level: 'warning',
          source: 'observation',
          message: 'Gantt view に Today 縦線が無い (TeamGantt/GanttPRO の典型機能)',
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
