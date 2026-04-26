/**
 * Phase 6.15 loop iter 23 — Notification bell 探索 (空状態 + 通知投入 + click)。
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
  const email = `iter23-${stamp}@example.com`
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
    ws_name: `iter23-${stamp}`,
    ws_slug: `iter23-${stamp}`,
  })
  const workspaceId = wsId as string

  // 通知 1 件 (mention type) を直接投入
  const { data: itemRow } = await admin
    .from('items')
    .insert({
      workspace_id: workspaceId,
      title: 'iter23 mention target',
      status: 'todo',
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
    .select('id')
    .single()
  const itemId = itemRow!.id as string
  await admin.from('notifications').insert({
    workspace_id: workspaceId,
    user_id: userId,
    type: 'mention',
    payload: { itemId, by: 'tester', preview: '@you どう思う?' },
  })

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
    await page.waitForTimeout(2000)
    await page.screenshot({ path: '/tmp/uiux-bell-iter23-1.png', fullPage: true })

    // bell button (Bell icon を持つ button)
    const bell = page.locator(
      'button[aria-label*="通知" i], button[aria-label*="notification" i], [data-testid*="notification-bell" i], [data-testid*="bell" i]',
    )
    const bellCount = await bell.count()
    console.log(`[iter23] bell button candidates: ${bellCount}`)
    if (bellCount === 0) {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message: 'notification bell button が aria-label / data-testid で特定できない',
      })
    } else {
      // 未読バッジの数字
      const badgeText = await bell.first().textContent()
      console.log(`[iter23] bell text content: ${(badgeText ?? '').trim().slice(0, 50)}`)

      await bell
        .first()
        .click({ timeout: 1500 })
        .catch(() => {})
      await page.waitForTimeout(700)
      await page.screenshot({ path: '/tmp/uiux-bell-iter23-2-popover.png', fullPage: true })

      // popover 開く
      const popover = await page.locator('[role="dialog"], [data-state="open"]').count()
      console.log(`[iter23] popover/dialog count: ${popover}`)
      if (popover === 0) {
        findings.push({
          level: 'warning',
          source: 'observation',
          message: 'bell click 後に popover/dialog が開かない',
        })
      }

      // mention 通知の preview text が見えるか
      const mentionVisible = await page.locator('text=tester').count()
      console.log(`[iter23] "tester" mention text visible: ${mentionVisible}`)
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
