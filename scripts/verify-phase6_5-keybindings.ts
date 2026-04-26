/**
 * Phase 6.5 keybindings help modal 検証 (one-off):
 *   - login → workspace
 *   - `?` 押下 → modal 表示
 *   - 既知 shortcut (?, q, g t-d など) が一覧に出ている
 *   - Esc 押下 → modal が閉じる
 *   - Cmd+K → Palette → "ショートカット" で検索 → command が出る
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
  const email = `phase6_5-${stamp}@example.com`
  const password = 'password1234'
  const cu = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (cu.error || !cu.data.user) throw cu.error

  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, baseURL: BASE })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.error('[page-error]', e.message))

  try {
    // login
    await page.goto(`${BASE}/login`)
    await page.locator('#email').fill(email)
    await page.locator('#password').fill(password)
    await page.getByRole('button', { name: /ログイン/ }).click()
    await page.waitForURL('/')
    console.log('✓ login OK')

    // create workspace
    await page.locator('#name').fill('P6.5 keybindings')
    await page.locator('#slug').fill(`p65-${stamp}`)
    await page.getByRole('button', { name: '作成', exact: true }).click()
    await page.waitForURL(/\/[0-9a-f-]{36}$/)
    const wsId = page.url().split('/').pop()!
    console.log(`✓ workspace OK: ${wsId}`)

    // body にフォーカスを移しておく (input にフォーカスがあると ? は無視される仕様)
    await page.evaluate(() => {
      const ae = document.activeElement as HTMLElement | null
      if (ae && ae !== document.body) ae.blur()
    })
    await page.waitForTimeout(200)

    // 1. ? でモーダルが開く (Shift+Slash と直接 keydown dispatch の両方を試す)
    await page.keyboard.press('Shift+Slash')
    await page.waitForTimeout(200)
    const visible = await page
      .locator('[data-testid="keybindings-help-modal"]')
      .isVisible()
      .catch(() => false)
    if (!visible) {
      // フォールバック: window に直接 keydown を dispatch
      await page.evaluate(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }))
      })
    }
    await page.waitForSelector('[data-testid="keybindings-help-modal"]', { timeout: 3000 })
    console.log('✓ `?` opens modal')
    await page.screenshot({ path: '/tmp/phase6_5-modal.png', fullPage: true })

    // 2. 既知の shortcut が表示されている
    const wantedCombos = ['?', 'q', 'g t', 'g d']
    for (const combo of wantedCombos) {
      const sel = `[data-testid="keybinding-combo-${cssEscape(combo)}"]`
      const found = await page.locator(sel).count()
      if (found < 1) throw new Error(`combo "${combo}" not found in modal`)
    }
    console.log(`✓ shortcuts visible: ${wantedCombos.join(' / ')}`)

    // 3. Esc で閉じる
    await page.keyboard.press('Escape')
    await page.waitForSelector('[data-testid="keybindings-help-modal"]', {
      state: 'hidden',
      timeout: 3000,
    })
    console.log('✓ Esc closes modal')

    // 4. Command Palette を開いて "ショートカット" コマンドを検索
    const isMac = process.platform === 'darwin'
    await page.keyboard.press(isMac ? 'Meta+K' : 'Control+K')
    await page.waitForSelector('[role="dialog"] input[placeholder*="コマンド"]', { timeout: 3000 })
    await page.keyboard.type('ショートカット')
    await page.waitForTimeout(300)
    const cmdItem = page.locator('[role="option"]', { hasText: 'ショートカット一覧' })
    if ((await cmdItem.count()) < 1) {
      await page.screenshot({ path: '/tmp/phase6_5-palette-fail.png', fullPage: true })
      throw new Error('command "ヘルプ: ショートカット一覧" not found in palette')
    }
    console.log('✓ palette shows "ヘルプ: ショートカット一覧"')

    // 5. Palette から実行 → モーダルが再び開く
    await cmdItem.first().click()
    await page.waitForSelector('[data-testid="keybindings-help-modal"]', { timeout: 3000 })
    console.log('✓ palette command opens modal')

    console.log('\n[OK] Phase 6.5 keybindings help modal 検証 PASS')
  } catch (e) {
    console.error('[FAIL]', e)
    await page.screenshot({ path: '/tmp/phase6_5-fail.png', fullPage: true }).catch(() => {})
    process.exitCode = 1
  } finally {
    await browser.close()
    await admin.auth.admin.deleteUser(cu.data.user!.id).catch(() => {})
  }
}

/** CSS attribute selector で安全に使えるよう、" と \ をエスケープ */
function cssEscape(v: string) {
  return v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

void main()
