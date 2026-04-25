/**
 * Phase 4 UI 動作確認 (one-off, not a test):
 *   - login → workspace 作成
 *   - ThemeToggle: html.dark の付与/解除
 *   - NotificationBell: popover open / 空状態テキスト
 *   - heartbeat scan で 1 件通知作成 → Realtime で badge 更新確認
 *   - dark mode のスクショ
 *
 * 実行:
 *   pnpm exec playwright install chromium  # 初回のみ
 *   pnpm dev                                # 別 shell で起動
 *   pnpm tsx --env-file=.env.local scripts/verify-phase4-ui.ts
 *
 * 結果は /tmp/phase4-*.png に保存。
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
  const email = `phase4-${stamp}@example.com`
  const password = 'password1234'
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (created.error || !created.data.user) throw created.error
  const userId = created.data.user.id

  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    baseURL: BASE,
  })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.error('[page-error]', e.message))
  page.on('console', (m) => {
    const t = m.type()
    if (t === 'error') console.error('[console-error]', m.text())
    if (t === 'debug' || (t === 'log' && m.text().includes('[notification-realtime]'))) {
      console.log('[browser]', m.text())
    }
  })

  try {
    // 1. login
    await page.goto(`${BASE}/login`)
    await page.locator('#email').fill(email)
    await page.locator('#password').fill(password)
    await page.getByRole('button', { name: /ログイン/ }).click()
    await page.waitForURL('/')
    console.log('✓ login OK')

    // 2. workspace 作成
    await page.locator('#name').fill('Phase4 検証')
    await page.locator('#slug').fill(`p4-${stamp}`)
    await page.getByRole('button', { name: '作成', exact: true }).click()
    await page.waitForURL(/\/[0-9a-f-]{36}$/)
    const wsId = page.url().split('/').pop()!
    console.log(`✓ workspace OK: ${wsId}`)

    // 3. ThemeToggle: 初期は light → click で dark
    const htmlClassBefore = await page.evaluate(() => document.documentElement.className)
    console.log(`html class before: "${htmlClassBefore}"`)
    await page.getByTestId('theme-toggle').click()
    await page.waitForTimeout(300)
    const htmlClassAfter = await page.evaluate(() => document.documentElement.className)
    console.log(`html class after:  "${htmlClassAfter}"`)
    if (!htmlClassAfter.includes('dark')) throw new Error('theme toggle did not add .dark')
    console.log('✓ theme toggle → dark OK')
    await page.screenshot({ path: '/tmp/phase4-dark.png', fullPage: true })

    // dark → light に戻す
    await page.getByTestId('theme-toggle').click()
    await page.waitForTimeout(300)
    const htmlClassFinal = await page.evaluate(() => document.documentElement.className)
    if (htmlClassFinal.includes('dark')) throw new Error('theme toggle did not remove .dark')
    console.log('✓ theme toggle → light OK')
    await page.screenshot({ path: '/tmp/phase4-light.png', fullPage: true })

    // 4. NotificationBell: badge 無し / popover 開く / 空状態
    const badgeCount = await page.getByTestId('notification-bell-badge').count()
    if (badgeCount !== 0) throw new Error(`expected no badge, got ${badgeCount}`)
    console.log('✓ bell badge: hidden when 0')

    await page.getByTestId('notification-bell').click()
    await page.waitForTimeout(300)
    const emptyText = await page.getByText('通知はありません').count()
    if (emptyText !== 1) throw new Error('popover empty state not shown')
    console.log('✓ bell popover open + empty state OK')
    await page.screenshot({ path: '/tmp/phase4-bell-empty.png', fullPage: true })

    // popover 閉じる
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)

    // 5. heartbeat: MUST item を期日 1 日後で作成 → scan → 通知発生
    //    (item はまず admin で直接 insert)
    const due = new Date()
    due.setUTCDate(due.getUTCDate() + 1)
    const ins = await admin
      .from('items')
      .insert({
        workspace_id: wsId,
        title: 'phase4-must-1d',
        description: '',
        status: 'todo',
        is_must: true,
        dod: 'OK',
        due_date: due.toISOString().slice(0, 10),
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      })
      .select('id')
      .single()
    if (ins.error) throw ins.error
    console.log(`✓ MUST item created: ${ins.data!.id}`)

    // Heartbeat ボタンを UI から click → scan 実行 → 通知 1 件発行
    await page.getByTestId('heartbeat-btn').click()
    // Realtime debounce 200ms + 1 round-trip + Supabase realtime channel 立ち上げ
    // 最大 8s 待って badge を polling
    let badgeText: string | null = null
    for (let i = 0; i < 30; i += 1) {
      await page.waitForTimeout(500)
      const badgeCount = await page.getByTestId('notification-bell-badge').count()
      if (badgeCount > 0) {
        badgeText = await page.getByTestId('notification-bell-badge').first().textContent()
        console.log(`✓ Realtime fired after ~${(i + 1) * 500}ms`)
        break
      }
    }
    if (!badgeText) {
      console.warn('⚠ Realtime invalidation did not fire within 8s — fallback: page.reload()')
      await page.reload()
      await page.waitForTimeout(500)
      const badgeCount = await page.getByTestId('notification-bell-badge').count()
      if (badgeCount === 0)
        throw new Error('badge did not appear even after reload (SSR fetch broken?)')
      badgeText = await page.getByTestId('notification-bell-badge').first().textContent()
      console.log(`△ bell badge after reload (Realtime did NOT work): "${badgeText}"`)
    } else {
      console.log(`✓ bell badge via Realtime: "${badgeText}"`)
    }

    // popover open → 通知 1 件 + 「全て既読」 click
    await page.getByTestId('notification-bell').click()
    await page.waitForTimeout(300)
    const itemCount = await page.getByTestId('notification-item').count()
    console.log(`✓ popover items: ${itemCount}`)
    await page.screenshot({ path: '/tmp/phase4-bell-with-notif.png', fullPage: true })

    await page.getByTestId('notification-mark-all-read').click()
    await page.waitForTimeout(800)
    const badgeFinal = await page.getByTestId('notification-bell-badge').count()
    if (badgeFinal !== 0) throw new Error(`expected 0 badge after mark all read, got ${badgeFinal}`)
    console.log('✓ mark all read → badge cleared')

    console.log('\n--- ALL OK ---')
    console.log('screenshots: /tmp/phase4-{dark,light,bell-empty,bell-with-notif}.png')
  } finally {
    await browser.close()
    await admin.auth.admin.deleteUser(userId).catch(() => {})
  }
}

void main().catch((e) => {
  console.error('FAIL', e)
  process.exit(1)
})
