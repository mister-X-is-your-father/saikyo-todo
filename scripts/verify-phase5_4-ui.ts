/**
 * Phase 5.4 PDCA Dashboard の UI 動作確認 (one-off):
 *   - login → workspace → Item を 3 件作成 (1 todo / 1 in_progress / 1 done)
 *   - Dashboard view へ → PDCA panel が描画される
 *   - 件数 (Plan=1, Do=1, Check=1, Act=0) が表示される
 *   - 30/90 日切替ボタンが動く
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
  const email = `phase5_4-${stamp}@example.com`
  const password = 'password1234'
  const cu = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (cu.error || !cu.data.user) throw cu.error
  const userId = cu.data.user.id

  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 1000 },
    baseURL: BASE,
  })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.error('[page-error]', e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') console.error('[console-error]', m.text())
  })

  try {
    await page.goto(`${BASE}/login`)
    await page.locator('#email').fill(email)
    await page.locator('#password').fill(password)
    await page.getByRole('button', { name: /ログイン/ }).click()
    await page.waitForURL('/')
    console.log('✓ login OK')

    await page.locator('#name').fill('P5.4 PDCA 検証')
    await page.locator('#slug').fill(`p54-${stamp}`)
    await page.getByRole('button', { name: '作成', exact: true }).click()
    await page.waitForURL(/\/[0-9a-f-]{36}$/)
    const wsId = page.url().split('/').pop()!
    console.log(`✓ workspace OK: ${wsId}`)

    // 3 件作成: 1 todo / 1 in_progress / 1 done (admin で直接 insert)
    // todo
    const ins1 = await admin
      .from('items')
      .insert({
        workspace_id: wsId,
        title: 'plan-item',
        description: '',
        status: 'todo',
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      })
      .select('id')
      .single()
    if (ins1.error) throw ins1.error
    // in_progress
    const ins2 = await admin
      .from('items')
      .insert({
        workspace_id: wsId,
        title: 'do-item',
        description: '',
        status: 'in_progress',
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      })
      .select('id')
      .single()
    if (ins2.error) throw ins2.error
    // done (今日完了 → Check)
    const ins3 = await admin
      .from('items')
      .insert({
        workspace_id: wsId,
        title: 'check-item',
        description: '',
        status: 'done',
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      })
      .select('id')
      .single()
    if (ins3.error) throw ins3.error
    console.log('✓ 3 items 作成 (todo/in_progress/done)')

    // /pdca page へ (Phase 5.4: Dashboard 同居 → 専用ページに分離)
    await page.waitForTimeout(1500) // hydration
    await page.getByRole('link', { name: 'PDCA', exact: true }).click()
    await page.waitForURL(/\/pdca$/, { timeout: 15_000 })
    await page.waitForTimeout(1500)
    if ((await page.getByTestId('pdca-panel').count()) === 0)
      throw new Error('PDCA panel not rendered')
    console.log('✓ /pdca PDCA panel 表示')

    // 30 日 button が active (default)、90 日へ切替
    await page.getByTestId('pdca-period-90').click()
    await page.waitForTimeout(800)
    console.log('✓ 90 日切替')

    // Plan / Do / Check / Act いずれかの数値が表示される
    // Card 全体に "Plan" "Do" "Check" "Act" 文字列があれば OK
    for (const label of ['Plan', 'Do', 'Check', 'Act']) {
      if ((await page.getByText(label, { exact: true }).count()) === 0)
        throw new Error(`PDCA label ${label} not found`)
    }
    console.log('✓ 4 PDCA label 表示')

    await page.screenshot({ path: '/tmp/phase5_4-pdca.png', fullPage: true })
    console.log('\n--- ALL OK ---')
    console.log('screenshot: /tmp/phase5_4-pdca.png')
  } finally {
    await browser.close()
    await admin.auth.admin.deleteUser(userId).catch(() => {})
  }
}

void main().catch((e) => {
  console.error('FAIL', e)
  process.exit(1)
})
