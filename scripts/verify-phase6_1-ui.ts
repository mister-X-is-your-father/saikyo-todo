/**
 * Phase 6.1 AI 分解 staging UI の動作確認 (one-off):
 *   - login → workspace → Item 作成
 *   - admin で agent_decompose_proposals に 3 件 pending を直接挿入 (Researcher 呼ばずに UI を検証)
 *   - ItemEditDialog → 子タスク tab → DecomposeProposalsPanel が表示される
 *   - 1 件目を採用 → items 配下に新行
 *   - 2 件目を編集 (title 変更) → 採用
 *   - 3 件目を全て却下ボタンで一括却下
 *   - パネルが消える (pending=0)
 *
 * Researcher は呼ばないので ANTHROPIC_API_KEY 不要。staging table の挙動と UI 動作だけを担保する。
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
  const email = `phase6_1-${stamp}@example.com`
  const password = 'password1234'
  const cu = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (cu.error || !cu.data.user) throw cu.error

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
    await page.locator('#name').fill('P6.1 分解 staging 検証')
    await page.locator('#slug').fill(`p61-${stamp}`)
    await page.getByRole('button', { name: '作成', exact: true }).click()
    await page.waitForURL(/\/[0-9a-f-]{36}$/)
    const wsId = page.url().split('/').pop()!
    console.log(`✓ workspace OK: ${wsId}`)

    // Item 作成 (QuickAdd 経由)
    await page.waitForTimeout(1500)
    const quickAddInput = page.locator('#quick-add-input')
    await quickAddInput.fill('AI 分解対象タスク')
    await page.getByTestId('quick-add-submit').click()
    await page.waitForTimeout(1500)

    // 親 Item の id を DB から取得
    const { data: parentRow } = await admin
      .from('items')
      .select('id')
      .eq('workspace_id', wsId)
      .eq('title', 'AI 分解対象タスク')
      .single()
    if (!parentRow?.id) throw new Error('parent item not found')
    const parentId = parentRow.id as string
    console.log(`✓ parent item: ${parentId}`)

    // admin で proposals を 3 件挿入
    const proposals = await admin
      .from('agent_decompose_proposals')
      .insert([
        {
          workspace_id: wsId,
          parent_item_id: parentId,
          title: '提案 A: 仕様書を読む',
          description: '既存の認証仕様を一通り把握する',
          is_must: false,
          sort_order: 0,
          status_proposal: 'pending',
        },
        {
          workspace_id: wsId,
          parent_item_id: parentId,
          title: '提案 B: スキーマ設計',
          description: '',
          is_must: false,
          sort_order: 1,
          status_proposal: 'pending',
        },
        {
          workspace_id: wsId,
          parent_item_id: parentId,
          title: '提案 C: プロト実装',
          description: '',
          is_must: false,
          sort_order: 2,
          status_proposal: 'pending',
        },
      ])
      .select('id')
    if (proposals.error) throw proposals.error
    console.log(`✓ proposals inserted: ${proposals.data?.length}`)

    // ItemEditDialog を開く: Backlog view に切替 → 行の編集ボタン
    await page.getByTestId('view-backlog-btn').click()
    await page.waitForTimeout(800)
    await page.getByTestId(`backlog-edit-${parentId}`).click()
    await page.waitForSelector('[data-testid="item-edit-dialog"]', { timeout: 5000 })
    console.log('✓ Item edit dialog opened')

    // 子タスク tab に切替
    await page.getByTestId('tab-subtasks').click()
    await page.waitForTimeout(800)

    // パネルが見える
    const panel = page.getByTestId('decompose-proposals-panel')
    await panel.waitFor({ state: 'visible', timeout: 5000 })
    console.log('✓ DecomposeProposalsPanel visible')
    await page.screenshot({ path: '/tmp/phase6_1-panel-3pending.png', fullPage: true })

    // 1 件目を採用
    const firstId = proposals.data![0]!.id as string
    await page.getByTestId(`proposal-${firstId}-accept`).click()
    await page.waitForTimeout(1000)
    {
      const { count } = await admin
        .from('agent_decompose_proposals')
        .select('id', { count: 'exact', head: true })
        .eq('parent_item_id', parentId)
        .eq('status_proposal', 'accepted')
      if (count !== 1) throw new Error(`accepted count expected 1, got ${count}`)
    }
    {
      const { count } = await admin
        .from('items')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', wsId)
        .eq('title', '提案 A: 仕様書を読む')
      if (!count || count < 1) throw new Error('accepted item not found in items table')
    }
    console.log('✓ 1 件採用 → items に新行 + status=accepted')

    // 2 件目を編集してから採用
    const secondId = proposals.data![1]!.id as string
    await page.getByTestId(`proposal-${secondId}-edit-btn`).click()
    await page.waitForSelector(`[data-testid="proposal-${secondId}-edit"]`, { timeout: 3000 })
    const titleInput = page.locator(`#p-title-${secondId}`)
    await titleInput.fill('提案 B (編集済): スキーマ詳細設計')
    await page.getByTestId(`proposal-${secondId}-save`).click()
    await page.waitForTimeout(800)
    await page.getByTestId(`proposal-${secondId}-accept`).click()
    await page.waitForTimeout(1000)
    {
      const { data } = await admin
        .from('items')
        .select('title')
        .eq('workspace_id', wsId)
        .eq('title', '提案 B (編集済): スキーマ詳細設計')
        .single()
      if (!data) throw new Error('edited proposal not committed with new title')
    }
    console.log('✓ 2 件目: 編集 → 採用 → items に新タイトルで新行')

    // 残り 1 件を全て却下ボタンで却下
    await page.getByTestId('proposals-reject-all').click()
    await page.waitForTimeout(1000)
    {
      const { count: pendingCount } = await admin
        .from('agent_decompose_proposals')
        .select('id', { count: 'exact', head: true })
        .eq('parent_item_id', parentId)
        .eq('status_proposal', 'pending')
      if (pendingCount !== 0) throw new Error(`pending should be 0, got ${pendingCount}`)
      const { count: rejCount } = await admin
        .from('agent_decompose_proposals')
        .select('id', { count: 'exact', head: true })
        .eq('parent_item_id', parentId)
        .eq('status_proposal', 'rejected')
      if (rejCount !== 1) throw new Error(`rejected expected 1, got ${rejCount}`)
    }
    console.log('✓ 全て却下 → pending=0 / rejected=1')

    // パネルが消える
    await page.waitForTimeout(500)
    await panel.waitFor({ state: 'hidden', timeout: 3000 })
    console.log('✓ pending=0 でパネル非表示')
    await page.screenshot({ path: '/tmp/phase6_1-panel-hidden.png', fullPage: true })

    console.log('\n[OK] Phase 6.1 UI checks passed')
  } catch (e) {
    console.error('[FAIL]', e)
    await page.screenshot({ path: '/tmp/phase6_1-fail.png', fullPage: true }).catch(() => {})
    process.exitCode = 1
  } finally {
    await browser.close()
    await admin.auth.admin.deleteUser(cu.data.user!.id).catch(() => {})
  }
}

void main()
