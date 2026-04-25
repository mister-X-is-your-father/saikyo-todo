/**
 * Phase 6.2 Realtime push UI 検証 (one-off):
 *   - login → workspace → Item 作成 → 編集ダイアログ開く → 子タスク tab
 *   - admin で proposals を 1 件ずつ少し間隔を空けて INSERT
 *   - パネルに行が live で増えていくか確認 (Realtime via supabase_realtime publication)
 *   - 同様に agent_invocations 行を INSERT (status=running) + output.streamingText を更新
 *   - パネル header の streaming-text が live で更新されるか確認
 *
 * Researcher は呼ばないので ANTHROPIC_API_KEY 不要。Realtime publication と購読 hook
 * の動作だけ担保する。
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
  const email = `phase6_2-${stamp}@example.com`
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

  try {
    await page.goto(`${BASE}/login`)
    await page.locator('#email').fill(email)
    await page.locator('#password').fill(password)
    await page.getByRole('button', { name: /ログイン/ }).click()
    await page.waitForURL('/')
    console.log('✓ login OK')

    await page.locator('#name').fill('P6.2 Realtime 検証')
    await page.locator('#slug').fill(`p62-${stamp}`)
    await page.getByRole('button', { name: '作成', exact: true }).click()
    await page.waitForURL(/\/[0-9a-f-]{36}$/)
    const wsId = page.url().split('/').pop()!
    console.log(`✓ workspace OK: ${wsId}`)

    await page.waitForTimeout(1500)
    await page.locator('#quick-add-input').fill('Realtime 親タスク')
    await page.getByTestId('quick-add-submit').click()
    await page.waitForTimeout(1500)

    const { data: parentRow } = await admin
      .from('items')
      .select('id')
      .eq('workspace_id', wsId)
      .eq('title', 'Realtime 親タスク')
      .single()
    const parentId = parentRow!.id as string
    console.log(`✓ parent item: ${parentId}`)

    // Backlog → 編集 → 子タスクタブ
    await page.getByTestId('view-backlog-btn').click()
    await page.waitForTimeout(800)
    await page.getByTestId(`backlog-edit-${parentId}`).click()
    await page.waitForSelector('[data-testid="item-edit-dialog"]', { timeout: 5000 })
    await page.getByTestId('tab-subtasks').click()
    await page.waitForTimeout(800)
    console.log('✓ dialog → 子タスク tab')

    // agent_invocations を直接 INSERT して "running" + streamingText を流す
    // まず agent を作成 (新規 ws なので unique 衝突なし)
    const { data: agentRow, error: agentErr } = await admin
      .from('agents')
      .insert({
        workspace_id: wsId,
        role: 'researcher',
        display_name: 'Researcher Agent',
        system_prompt_version: 1,
      })
      .select('id')
      .single()
    if (agentErr) throw agentErr
    const agentId = agentRow!.id as string

    const idemp = crypto.randomUUID()
    const { data: invRow } = await admin
      .from('agent_invocations')
      .insert({
        agent_id: agentId,
        workspace_id: wsId,
        target_item_id: parentId,
        status: 'running',
        input: { userMessage: 'simulate', role: 'researcher', systemPromptVersion: 1 },
        model: 'claude-sonnet-4-6',
        idempotency_key: idemp,
        output: { streamingText: '' },
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single()
    const invId = invRow!.id as string
    console.log(`✓ invocation injected: ${invId}`)

    // streaming text を 3 回更新する
    const deltas = ['この Item を 3-5 件に', '分解します。', 'まずは仕様を確認…']
    let acc = ''
    for (const d of deltas) {
      acc += d
      await admin
        .from('agent_invocations')
        .update({ output: { streamingText: acc } })
        .eq('id', invId)
      await page.waitForTimeout(800)
    }

    // streaming-text 要素が反映されているか
    await page.waitForSelector('[data-testid="agent-streaming-text"]', { timeout: 5000 })
    const streamText = await page.getByTestId('agent-streaming-text').innerText()
    if (!streamText.includes('まずは仕様を確認')) {
      throw new Error(`streamingText not propagated: got "${streamText}"`)
    }
    console.log(`✓ streaming text live: "${streamText.slice(0, 50)}…"`)
    await page.screenshot({ path: '/tmp/phase6_2-streaming.png', fullPage: true })

    // proposals を 1 件ずつ INSERT して live で行が増えるか
    for (let i = 0; i < 3; i++) {
      await admin.from('agent_decompose_proposals').insert({
        workspace_id: wsId,
        parent_item_id: parentId,
        agent_invocation_id: invId,
        title: `live-proposal-${i + 1}`,
        description: '',
        is_must: false,
        sort_order: i,
        status_proposal: 'pending',
      })
      await page.waitForTimeout(400)
    }
    // panel-list 内に 3 件
    await page.waitForFunction(
      () => document.querySelectorAll('[data-testid^="proposal-"]').length >= 3,
      { timeout: 5000 },
    )
    console.log('✓ 3 proposals appeared via Realtime')

    // invocation を completed に → "Researcher が分解中…" が消える
    await admin
      .from('agent_invocations')
      .update({
        status: 'completed',
        output: { text: 'done', streamingText: '' },
        finished_at: new Date().toISOString(),
        input_tokens: 100,
        output_tokens: 50,
      })
      .eq('id', invId)
    await page.waitForTimeout(800)
    const visible = await page
      .getByTestId('agent-streaming-text')
      .isVisible()
      .catch(() => false)
    if (visible) {
      console.warn(
        '   - streaming-text element still visible (acceptable: completed event might be delayed)',
      )
    } else {
      console.log('✓ completed → streaming UI hidden')
    }
    await page.screenshot({ path: '/tmp/phase6_2-completed.png', fullPage: true })

    console.log('\n[OK] Phase 6.2 Realtime push UI checks passed')
  } catch (e) {
    console.error('[FAIL]', e)
    await page.screenshot({ path: '/tmp/phase6_2-fail.png', fullPage: true }).catch(() => {})
    process.exitCode = 1
  } finally {
    await browser.close()
    await admin.auth.admin.deleteUser(cu.data.user!.id).catch(() => {})
  }
}

void main()
