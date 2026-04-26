/**
 * Phase 6.15 loop iter 20 — iter19 で Inbox items 0 だった件を詳細再検証。
 *
 * 仮説:
 *   (1) items テーブル client cache (TanStack Query) の refetch 待ち不足
 *   (2) Inbox plugin の filter が status='todo' AND scheduled_for IS NULL だが
 *       status の workspace_statuses 連携で違う key だった (例: 'open' / 'pending')
 *   (3) admin で insert した items が RLS 経由 query に出ない (created_by_actor が違う)
 *   (4) item-card の text content がイベントを別要素に attach
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
  const email = `iter20-${stamp}@example.com`
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
    ws_name: `iter20-${stamp}`,
    ws_slug: `iter20-${stamp}`,
  })
  const workspaceId = wsId as string

  // workspace_statuses を確認 (デフォルトの status key 一覧)
  const { data: statuses } = await admin
    .from('workspace_statuses')
    .select('key, label, type, position')
    .eq('workspace_id', workspaceId)
    .order('position')
  console.log('[iter20] workspace_statuses:', JSON.stringify(statuses))

  // status は 'todo' で投入 (デフォルトに含まれるはず)
  await admin.from('items').insert([
    {
      workspace_id: workspaceId,
      title: 'inbox A iter20',
      status: 'todo',
      priority: 1,
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    },
    {
      workspace_id: workspaceId,
      title: 'inbox B iter20',
      status: 'todo',
      priority: 2,
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    },
  ])

  // admin で items を確認
  const { data: insertedItems } = await admin
    .from('items')
    .select('id, title, status, scheduled_for, deleted_at')
    .eq('workspace_id', workspaceId)
  console.log('[iter20] inserted items:', JSON.stringify(insertedItems))

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
    await page.goto(`${BASE}/${workspaceId}`, { waitUntil: 'networkidle' })
    // 追加 wait (TanStack Query の fetchOnMount を待つ)
    await page.waitForTimeout(3000)

    // Today view (default) で先に確認
    const todayItems = await page.locator('text=iter20').count()
    console.log(`[iter20] Today view: items visible = ${todayItems}`)

    // Inbox 切替
    const inboxTab = page
      .locator('button:has-text("Inbox"), [role="tab"]:has-text("Inbox")')
      .first()
    await inboxTab.click({ timeout: 3000 })
    await page.waitForTimeout(2500)
    await page.screenshot({ path: '/tmp/uiux-inbox-recheck-iter20.png', fullPage: true })

    const inboxItems = await page.locator('text=iter20').count()
    console.log(`[iter20] Inbox view: items visible = ${inboxItems}`)

    // ヘッダ / 空メッセージ
    const headings = await page.locator('h1, h2, h3, [data-slot=card-title]').allTextContents()
    const empty = await page.locator('text=ありません, text=Empty').count()
    console.log(`[iter20] headings=${JSON.stringify(headings.slice(0, 6))} empty=${empty}`)

    if (inboxItems === 0) {
      findings.push({
        level: 'error',
        source: 'observation',
        message:
          'Inbox: admin insert した items 2 件が visible 0 (3s wait + click 後 2.5s) — filter / cache 問題確定',
      })
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
