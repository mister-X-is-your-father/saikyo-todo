/**
 * Phase 6.15 loop iter 25 — /archive で archived items が visible 0 だった件を詳細追跡。
 * useItems の返り値 (各 item の archivedAt 型と値) を実際に Browser console に出力させて確認。
 */
import { chromium } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const BASE = 'http://localhost:3001'
const SUPABASE_URL = 'http://127.0.0.1:54321'

async function main() {
  const stamp = Date.now()
  const email = `iter25-${stamp}@example.com`
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
    ws_name: `iter25-${stamp}`,
    ws_slug: `iter25-${stamp}`,
  })
  const workspaceId = wsId as string

  const now = new Date().toISOString()
  await admin.from('items').insert([
    {
      workspace_id: workspaceId,
      title: 'archived A',
      status: 'done',
      archived_at: now,
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    },
    {
      workspace_id: workspaceId,
      title: 'NOT archived',
      status: 'todo',
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    },
  ])

  // admin でも確認
  const { data: dbItems } = await admin
    .from('items')
    .select('id, title, archived_at, deleted_at')
    .eq('workspace_id', workspaceId)
  console.log('[iter25] DB items:')
  for (const it of dbItems ?? []) console.log('  ', JSON.stringify(it))

  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  page.on('console', (m) => {
    if (m.type() === 'log' || m.type() === 'error' || m.type() === 'warning') {
      const t = m.text()
      if (t.includes('iter25-debug')) console.log('  [browser]', t.slice(0, 500))
    }
  })

  try {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
    await page.locator('input#email').fill(email)
    await page.locator('input#password').fill(password)
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(`${BASE}/`, { timeout: 10_000 })

    await page.goto(`${BASE}/${workspaceId}/archive`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(3000)

    // page から fetch して直接 listItemsAction の結果を確認することはできないので、
    // archived-items-panel の DOM 状態と useItems result から逆算
    const debug = await page.evaluate(async (ws) => {
      // window.__NEXT_DATA__ などから items を直接取れない可能性あり、代わりに fetch
      // 実際の Server Action は client-side fetch だと内部 protocol で動かない
      // → DOM rendered DOM の archive panel からテキストを抽出
      const list = document.querySelector('[data-testid="archive-list"]')
      const empty = document.querySelector('[data-testid="archive-empty"]')
      const rows = document.querySelectorAll('[data-testid^="archive-row-"]')
      return {
        ws,
        listExists: list !== null,
        emptyExists: empty !== null,
        rowCount: rows.length,
        emptyText: empty?.textContent?.trim().slice(0, 80) ?? null,
      }
    }, workspaceId)
    console.log('[iter25-debug]', JSON.stringify(debug))

    // もう一度 Today view に行って all items の数を確認 (=useItems の返り値)
    await page.goto(`${BASE}/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2500)
    const allItemsRendered = await page.locator('text=archived A').count()
    const notArchivedRendered = await page.locator('text=NOT archived').count()
    console.log(
      `[iter25] Today view: 'archived A' visible=${allItemsRendered} 'NOT archived' visible=${notArchivedRendered}`,
    )
  } finally {
    await ctx.close()
    await browser.close()
    await admin.auth.admin.deleteUser(userId).catch(() => {})
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => process.exit(0))
