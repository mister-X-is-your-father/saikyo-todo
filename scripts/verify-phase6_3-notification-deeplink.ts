/**
 * Phase 6.3 通知 → Item dialog 自動 open 検証 (one-off):
 *   - login → workspace → MUST 期限切れ Item を作成
 *   - heartbeat scan で notification を生成
 *   - Bell click → 通知 click → ?item=<id> URL + ItemEditDialog 自動 open
 */
import { chromium } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const BASE = 'http://localhost:3001'
const SUPA = 'http://127.0.0.1:54321'

async function main() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY missing')
  const admin = createClient(SUPA, serviceKey, { auth: { persistSession: false } })

  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const email = `phase6_3-${stamp}@example.com`
  const password = 'password1234'
  const cu = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (cu.error || !cu.data.user) throw cu.error

  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, baseURL: BASE })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.error('[page-error]', e.message))

  try {
    await page.goto(`${BASE}/login`)
    await page.locator('#email').fill(email)
    await page.locator('#password').fill(password)
    await page.getByRole('button', { name: /ログイン/ }).click()
    await page.waitForURL('/')
    console.log('✓ login OK')

    await page.locator('#name').fill('P6.3 通知 deep-link')
    await page.locator('#slug').fill(`p63-${stamp}`)
    await page.getByRole('button', { name: '作成', exact: true }).click()
    await page.waitForURL(/\/[0-9a-f-]{36}$/)
    const wsId = page.url().split('/').pop()!
    console.log(`✓ workspace OK: ${wsId}`)

    // 期限直前の MUST item を直挿入 (3 日後)
    const due = new Date()
    due.setDate(due.getDate() + 3)
    const dueISO = due.toISOString().slice(0, 10)
    const { data: itemRow } = await admin
      .from('items')
      .insert({
        workspace_id: wsId,
        title: '通知テスト用 MUST',
        description: '',
        status: 'todo',
        is_must: true,
        dod: 'OK',
        due_date: dueISO,
        parent_path: '',
        position: 'a0',
        created_by_actor_type: 'user',
        created_by_actor_id: cu.data.user.id,
      })
      .select('id')
      .single()
    const itemId = itemRow!.id as string

    // notifications を直接 INSERT (heartbeat scan を待たず確実に作る)
    await admin.from('notifications').insert({
      workspace_id: wsId,
      user_id: cu.data.user.id,
      type: 'heartbeat',
      payload: {
        itemId,
        stage: '3d',
        dueDate: dueISO,
        daysUntilDue: 3,
      },
      created_at: new Date().toISOString(),
    })
    console.log(`✓ heartbeat notification injected for item=${itemId.slice(0, 8)}`)

    // ページリロードして SSR で initialUnreadCount を取り直す
    await page.reload()
    await page.waitForTimeout(1500)

    // バッジが見える
    await page.waitForSelector('[data-testid="notification-bell-badge"]', { timeout: 5000 })
    console.log('✓ bell badge visible (unread > 0)')

    // bell click
    await page.getByTestId('notification-bell').click()
    await page.waitForSelector('[data-testid="notification-item"]', { timeout: 5000 })
    console.log('✓ popover opened, notification item visible')

    // 通知 click
    await page.getByTestId('notification-item').first().click()

    // URL に ?item=... が入る
    await page.waitForFunction(
      (expected) => window.location.search.includes(`item=${expected}`),
      itemId,
      {
        timeout: 5000,
      },
    )
    console.log('✓ URL has ?item=<id>')

    // ダイアログが開く
    await page.waitForSelector('[data-testid="item-edit-dialog"]', { timeout: 5000 })
    console.log('✓ ItemEditDialog auto-opened')
    await page.screenshot({ path: '/tmp/phase6_3-dialog.png', fullPage: true })

    // ダイアログを閉じる → URL から item param が消える
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
    await page.waitForFunction(() => !window.location.search.includes('item='), { timeout: 5000 })
    console.log('✓ closing dialog clears ?item param')

    console.log('\n[OK] Phase 6.3 通知 deep-link 検証 PASS')
  } catch (e) {
    console.error('[FAIL]', e)
    await page.screenshot({ path: '/tmp/phase6_3-fail.png', fullPage: true }).catch(() => {})
    process.exitCode = 1
  } finally {
    await browser.close()
    await admin.auth.admin.deleteUser(cu.data.user!.id).catch(() => {})
  }
}

void main()
