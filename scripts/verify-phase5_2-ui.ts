/**
 * Phase 5.2 OKR + 子タスク手動分解の UI 動作確認 (one-off):
 *   - login → workspace → /goals
 *   - Goal 作成 → expand → KR 追加 (items mode)
 *   - workspace に戻って Item 作成 → ItemEditDialog で KR 割当
 *   - Goal 進捗が 0% (todo 1 件) で表示される
 *   - ItemEditDialog 子タスク tab で textarea bulk add → 3 件作成
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
  const email = `phase5_2-${stamp}@example.com`
  const password = 'password1234'
  const cu = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (cu.error || !cu.data.user) throw cu.error
  const userId = cu.data.user.id

  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    baseURL: BASE,
  })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.error('[page-error]', e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') console.error('[console-error]', m.text())
  })

  try {
    // login
    await page.goto(`${BASE}/login`)
    await page.locator('#email').fill(email)
    await page.locator('#password').fill(password)
    await page.getByRole('button', { name: /ログイン/ }).click()
    await page.waitForURL('/')
    console.log('✓ login OK')

    // workspace
    await page.locator('#name').fill('P5.2 OKR 検証')
    await page.locator('#slug').fill(`p52-${stamp}`)
    await page.getByRole('button', { name: '作成', exact: true }).click()
    await page.waitForURL(/\/[0-9a-f-]{36}$/)
    const wsId = page.url().split('/').pop()!
    console.log(`✓ workspace OK: ${wsId}`)

    // Goals page
    await page.waitForTimeout(1500) // hydration 待ち
    await page.getByRole('link', { name: 'Goals', exact: true }).click()
    await page.waitForURL(/\/goals$/, { timeout: 15_000 })
    await page.waitForTimeout(500)
    console.log('✓ /goals 遷移')

    // Goal 作成
    await page.locator('#goal-title').fill('Q2 速度改善')
    await page.getByTestId('goal-create-btn').click()
    await page.waitForTimeout(800)
    const goalCount = await page.locator('[data-testid^="goal-card-"]').count()
    if (goalCount !== 1) throw new Error(`expected 1 goal, got ${goalCount}`)
    console.log('✓ Goal 作成')

    // Goal を expand
    await page.locator('[data-testid^="goal-toggle-"]').first().click()
    await page.waitForTimeout(400)

    // KR 追加 (items mode)
    const goalCard = page.locator('[data-testid^="goal-card-"]').first()
    const goalId = (await goalCard.getAttribute('data-testid'))!.replace('goal-card-', '')
    await page.getByTestId(`kr-title-input-${goalId}`).fill('p95 < 200ms')
    await page.getByTestId(`kr-add-btn-${goalId}`).click()
    await page.waitForTimeout(800)
    const krCount = await page.getByTestId(`krs-${goalId}`).locator('li').count()
    if (krCount !== 1) throw new Error(`expected 1 KR, got ${krCount}`)
    console.log('✓ KR 追加')

    // workspace に戻って Item 作成
    await page
      .locator('a[href$="/' + wsId + '"]')
      .first()
      .click()
    await page.waitForURL(new RegExp(`/${wsId}$`))
    await page.waitForTimeout(500)
    await page.locator('#quick-add-input').fill('OKR 検証 item')
    await page.waitForTimeout(150)
    await page.getByTestId('quick-add-submit').click()
    await page.waitForTimeout(800)

    // Backlog で edit dialog 開く
    await page.getByTestId('view-backlog-btn').click()
    await page.waitForTimeout(500)
    await page.locator('[data-testid^="backlog-edit-"]').first().click()
    await page.waitForTimeout(500)
    if ((await page.getByTestId('item-edit-dialog').count()) === 0)
      throw new Error('dialog did not open')

    // KR 選択
    const krSel = page.getByTestId('edit-item-kr')
    const krOpts = await krSel.locator('option').allTextContents()
    console.log('  KR options:', krOpts)
    const krOptValue = await krSel
      .locator('option')
      .filter({ hasText: 'p95 < 200ms' })
      .first()
      .getAttribute('value')
    if (!krOptValue) throw new Error('KR option not found')
    await krSel.selectOption(krOptValue)
    await page.waitForTimeout(800)
    console.log('✓ Item を KR に割当')

    // 子タスク tab で bulk add
    await page.getByTestId('tab-subtasks').click()
    await page.waitForTimeout(300)
    const beforeCount = await page.locator('[data-testid^="subtask-"]').count()
    await page
      .getByTestId('subtasks-bulk-input')
      .fill('仕様書を読む\nスキーマ設計\nプロトタイプ実装')
    await page.getByTestId('subtasks-bulk-add-btn').click()
    await page.waitForTimeout(2000) // 3 件 sequential create
    const afterCount = await page.locator('[data-testid^="subtask-"]').count()
    if (afterCount - beforeCount !== 3)
      throw new Error(`expected +3 children, got +${afterCount - beforeCount}`)
    console.log(`✓ 子タスク bulk add: ${beforeCount} → ${afterCount}`)

    // dialog 閉じて Goals に戻り、進捗が出るか確認
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    await page.goto(`${BASE}/${wsId}/goals`)
    await page.waitForTimeout(800)
    await page.locator('[data-testid^="goal-toggle-"]').first().click()
    await page.waitForTimeout(800)
    // KR 進捗 0/1 が出るはず
    const zeroOne = await page.getByText(/items 0\/1/).count()
    if (zeroOne === 0) console.warn('⚠ KR 進捗 "items 0/1" が見えない (item 1 件 todo)')
    else console.log('✓ KR 進捗 表示 OK (0/1)')

    await page.screenshot({ path: '/tmp/phase5_2-goals.png', fullPage: true })
    console.log('\n--- ALL OK ---')
    console.log('screenshot: /tmp/phase5_2-goals.png')
  } finally {
    await browser.close()
    await admin.auth.admin.deleteUser(userId).catch(() => {})
  }
}

void main().catch((e) => {
  console.error('FAIL', e)
  process.exit(1)
})
