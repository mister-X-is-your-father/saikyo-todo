/**
 * Phase 6.15 loop iter 19 — Inbox view を items 投入で詳細探索 + ItemEditDialog 開く。
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
  const email = `iter19-${stamp}@example.com`
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
    ws_name: `iter19-${stamp}`,
    ws_slug: `iter19-${stamp}`,
  })
  const workspaceId = wsId as string

  // Inbox には scheduled_for=NULL の items が出る (Today にも出ない)
  await admin.from('items').insert([
    {
      workspace_id: workspaceId,
      title: 'inbox item A',
      status: 'todo',
      priority: 1,
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    },
    {
      workspace_id: workspaceId,
      title: 'inbox item B',
      status: 'todo',
      is_must: true,
      dod: 'PASS',
      priority: 2,
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    },
    {
      workspace_id: workspaceId,
      title: 'inbox item C done',
      status: 'done',
      priority: 3,
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    },
  ])

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

    const inboxTab = page
      .locator('button:has-text("Inbox"), [role="tab"]:has-text("Inbox")')
      .first()
    await inboxTab.click({ timeout: 3000 })
    await page.waitForTimeout(1000)
    await page.screenshot({ path: '/tmp/uiux-inbox-iter19-1.png', fullPage: true })

    // visible な item titles
    const itemTitleEls = await page.locator('text=inbox item').count()
    console.log(`[iter19] inbox items visible: ${itemTitleEls}`)
    if (itemTitleEls < 3) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: `Inbox: items 3 件投入したが visible は ${itemTitleEls}`,
      })
    }

    // ItemEditDialog を開く: item title を click (item-card 内のテキスト)
    const firstItem = page.locator('text=inbox item A').first()
    if ((await firstItem.count()) > 0) {
      await firstItem.click({ timeout: 1500 }).catch(() => {})
      await page.waitForTimeout(800)
      const dialog = await page.locator('[data-testid="item-edit-dialog"]').count()
      console.log(`[iter19] item-edit-dialog open: ${dialog}`)
      if (dialog === 0) {
        findings.push({
          level: 'warning',
          source: 'observation',
          message:
            'inbox item title click で ItemEditDialog が開かない (click target が title 以外?)',
        })
      } else {
        await page.screenshot({ path: '/tmp/uiux-inbox-iter19-2-dialog.png', fullPage: true })
        // 各 tab の存在
        for (const tab of ['基本', '子タスク', '依存', 'コメント', 'Activity']) {
          const t = await page
            .locator(
              `[data-testid="tab-${tab === '基本' ? 'base' : tab === '子タスク' ? 'subtasks' : tab === '依存' ? 'dependencies' : tab === 'コメント' ? 'comments' : 'activity'}"]`,
            )
            .count()
          if (t === 0) {
            findings.push({
              level: 'warning',
              source: 'observation',
              message: `ItemEditDialog: tab "${tab}" が見つからない`,
            })
          }
        }
        // 依存 tab を click
        const depTab = page.locator('[data-testid="tab-dependencies"]').first()
        if ((await depTab.count()) > 0) {
          await depTab.click({ timeout: 1000 }).catch(() => {})
          await page.waitForTimeout(500)
          await page.screenshot({ path: '/tmp/uiux-inbox-iter19-3-deps.png', fullPage: true })
        }
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
