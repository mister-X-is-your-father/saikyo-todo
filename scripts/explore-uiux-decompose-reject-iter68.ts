/**
 * Phase 6.15 loop iter 68 — decompose-proposals-panel "全て却下" の confirm dialog 確認。
 * 提案を agent 経由で生成するのは別 service なので、本スクリプトは
 * (a) workspace を開いた時に regression error が出ないか
 * (b) コード inspection で confirm() が挿入されたことを確認する smoke のみ。
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
  const email = `iter68-${stamp}@example.com`
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
    ws_name: `iter68-${stamp}`,
    ws_slug: `iter68-${stamp}`,
  })
  const workspaceId = wsId as string

  const ins = await admin
    .from('items')
    .insert({
      workspace_id: workspaceId,
      title: 'iter68 parent for proposals',
      status: 'todo',
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
    .select('id')
    .single()
  const itemId = ins.data!.id

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
    await page.goto(`${BASE}/${workspaceId}?item=${itemId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: '/tmp/uiux-decompose-reject-iter68-1.png', fullPage: true })
    // 子タスク tab に切替 (proposals panel が描画される場所)
    const subTab = page.locator('[data-testid="tab-subtasks"]')
    if ((await subTab.count()) > 0) {
      await subTab.click()
      await page.waitForTimeout(500)
    }
    // panel が描画されること自体は確認 (proposals は無いので button は出ない)
    const rejectAll = page.locator('[data-testid="proposals-reject-all"]')
    console.log(`[iter68] proposals-reject-all visible: ${(await rejectAll.count()) > 0}`)
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
