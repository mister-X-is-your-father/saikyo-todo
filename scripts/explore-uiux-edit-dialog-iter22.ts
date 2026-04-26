/**
 * Phase 6.15 loop iter 22 — ItemEditDialog の中身を確認 (各 Tab + a11y)。
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
  const email = `iter22-${stamp}@example.com`
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
    ws_name: `iter22-${stamp}`,
    ws_slug: `iter22-${stamp}`,
  })
  const workspaceId = wsId as string

  const today = new Date().toISOString().slice(0, 10)
  const { data: itemRow } = await admin
    .from('items')
    .insert({
      workspace_id: workspaceId,
      title: 'iter22 dialog target',
      status: 'todo',
      scheduled_for: today,
      priority: 1,
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
    .select('id')
    .single()
  const itemId = itemRow!.id as string

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
    await page.goto(`${BASE}/${workspaceId}?item=${itemId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    await page.screenshot({ path: '/tmp/uiux-edit-dialog-iter22-1.png', fullPage: true })

    const dialog = await page.locator('[data-testid="item-edit-dialog"]').count()
    console.log(`[iter22] dialog open via ?item=: ${dialog}`)
    if (dialog === 0) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: '?item=<id> URL で ItemEditDialog が開かない (deep link 動作しない可能性)',
      })
    } else {
      // 各 tab の存在
      const tabs = ['base', 'subtasks', 'dependencies', 'comments', 'activity']
      const present: string[] = []
      const missing: string[] = []
      for (const t of tabs) {
        const c = await page.locator(`[data-testid="tab-${t}"]`).count()
        if (c > 0) present.push(t)
        else missing.push(t)
      }
      console.log(`[iter22] tabs present: ${present.join(',')}`)
      if (missing.length > 0) {
        findings.push({
          level: 'warning',
          source: 'observation',
          message: `ItemEditDialog: missing tabs: ${missing.join(',')}`,
        })
      }

      // 依存 tab を click
      const depTab = page.locator('[data-testid="tab-dependencies"]').first()
      if ((await depTab.count()) > 0) {
        await depTab.click({ timeout: 1500 })
        await page.waitForTimeout(700)
        const depPanel = await page.locator('[data-testid="dependencies-panel"]').count()
        console.log(`[iter22] dependencies panel: ${depPanel}`)
        if (depPanel === 0) {
          findings.push({
            level: 'warning',
            source: 'observation',
            message: '依存 tab click 後 dependencies-panel が見当たらない',
          })
        }
        await page.screenshot({ path: '/tmp/uiux-edit-dialog-iter22-2-deps.png', fullPage: true })
      }

      // Engineer Trigger button
      const engBtn = await page.locator('[data-testid="engineer-trigger-btn"]').count()
      console.log(`[iter22] engineer trigger button: ${engBtn}`)

      // タイトル input
      const titleInput = await page.locator('input#editTitle').count()
      const titleRequired =
        (await page.locator('input#editTitle').getAttribute('required')) !== null
      console.log(`[iter22] title input: ${titleInput} required=${titleRequired}`)
      if (titleInput > 0 && !titleRequired) {
        findings.push({
          level: 'warning',
          source: 'a11y',
          message: 'ItemEditDialog: editTitle input に required なし',
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
