/**
 * Phase 6.15 loop iter 102 — ItemEditDialog Activity tab の disclosure pattern。
 * 「詳細を見る」button に aria-expanded / aria-controls 無し → SR で開閉状態が伝わらない。
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
  const email = `iter102-${stamp}@example.com`
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
    ws_name: `iter102-${stamp}`,
    ws_slug: `iter102-${stamp}`,
  })
  const workspaceId = wsId as string

  // item を作って update して audit_log に before/after が乗るようにする
  const { data: item } = await admin
    .from('items')
    .insert({
      workspace_id: workspaceId,
      title: 'iter102 audit item',
      status: 'todo',
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
    .select('id, version')
    .single()
  const itemId = item!.id

  // audit_log に手動で before/after 付き record を直接 insert (admin で更新 → trigger で生成)
  await admin.from('items').update({ description: 'updated for iter102' }).eq('id', itemId)

  // audit_log に entry を直接シード (workspace_member の admin 権限で trigger が記録するが、
  // この test workspace の作成者は admin 役なので手動 insert 不要)
  await admin.from('audit_log').insert({
    workspace_id: workspaceId,
    actor_type: 'user',
    actor_id: userId,
    action: 'update',
    target_type: 'item',
    target_id: itemId,
    before: { title: 'iter102 audit item' },
    after: { description: 'updated for iter102' },
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

  try {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
    await page.locator('input#email').fill(email)
    await page.locator('input#password').fill(password)
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(`${BASE}/`, { timeout: 10_000 })

    // ItemEditDialog deep link で開いて Activity tab に切替
    await page.goto(`${BASE}/${workspaceId}?item=${itemId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)

    // Activity tab を開く
    const activityTab = page
      .locator('[role="tab"]')
      .filter({ hasText: /Activity|アクティビティ|activity/i })
      .first()
    await activityTab.click({ trial: false }).catch(() => {})
    await page.waitForTimeout(800)

    const rows = await page.locator('[data-testid^="activity-row-"]').all()
    console.log(`[iter102] activity rows=${rows.length}`)

    if (rows.length > 0) {
      const detailBtn = rows[0]!.locator('button', { hasText: /詳細/ }).first()
      const exists = (await detailBtn.count()) > 0
      console.log(`[iter102] detail button exists=${exists}`)
      if (exists) {
        const ariaExpanded = await detailBtn.getAttribute('aria-expanded')
        const ariaControls = await detailBtn.getAttribute('aria-controls')
        console.log(
          `[iter102] detail btn: aria-expanded=${JSON.stringify(ariaExpanded)} aria-controls=${JSON.stringify(ariaControls)}`,
        )
        if (ariaExpanded === null) {
          findings.push({
            level: 'warning',
            source: 'a11y',
            message:
              'activity-log 詳細 disclosure button に aria-expanded なし (SR で開閉状態が伝わらない)',
          })
        }
        if (ariaControls === null) {
          findings.push({
            level: 'warning',
            source: 'a11y',
            message:
              'activity-log 詳細 disclosure button に aria-controls なし (SR で対象パネルが不明)',
          })
        }
      }
    }

    await page.screenshot({ path: '/tmp/uiux-activity-log-iter102.png' })
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
