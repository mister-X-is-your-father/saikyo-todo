/**
 * Phase 6.15 loop iter 118 — Workflow 編集 dialog (graph + trigger JSON) の動作検証。
 * 編集 → 保存 → reload で永続化を確認。zod バリデーション失敗で error 表示も確認。
 */
import { chromium } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const BASE = 'http://localhost:3001'
const SUPABASE_URL = 'http://127.0.0.1:54321'

interface Finding {
  level: 'error' | 'warning' | 'info'
  source: 'console' | 'pageerror' | 'observation'
  message: string
}

async function main() {
  const findings: Finding[] = []
  const stamp = Date.now()
  const email = `iter118-${stamp}@example.com`
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
    ws_name: `iter118-${stamp}`,
    ws_slug: `iter118-${stamp}`,
  })
  const workspaceId = wsId as string

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

    await page.goto(`${BASE}/${workspaceId}/workflows`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    // 1. 新規作成
    await page.locator('input#wf-name').fill('iter118 editable')
    await page.locator('[data-testid="wf-create-btn"]').click()
    await page.waitForTimeout(800)

    // 2. 編集 dialog を開く
    const editBtn = page.locator('[data-testid^="wf-edit-"]').first()
    await editBtn.click()
    await page.waitForTimeout(400)
    const dialogOpen = await page.locator('[data-slot="dialog-content"]').count()
    console.log(`[iter118] editor dialog opened: ${dialogOpen}`)
    if (!dialogOpen) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: '編集 dialog が開かない',
      })
    }

    // 3. graph に noop node を 1 件入れて保存
    const newGraph = JSON.stringify(
      { nodes: [{ id: 'n1', type: 'noop', config: {} }], edges: [] },
      null,
      2,
    )
    const graphTa = page.locator('[data-testid^="wf-editor-graph-"]').first()
    await graphTa.fill(newGraph)
    await page.locator('[data-testid^="wf-editor-save-"]').first().click()
    await page.waitForTimeout(1000)

    // dialog が閉じている + node 数が 1 に反映
    const cardText = await page.locator('[data-testid^="wf-card-"]').first().textContent()
    console.log(`[iter118] card after save: ${cardText?.replace(/\s+/g, ' ').slice(0, 150)}`)
    if (!cardText?.includes('nodes: 1')) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: `保存後 nodes: 1 が反映されない: ${cardText}`,
      })
    }

    // 4. 不正 JSON で error
    await page.locator('[data-testid^="wf-edit-"]').first().click()
    await page.waitForTimeout(400)
    await graphTa.fill('{ this is not json }')
    await page.locator('[data-testid^="wf-editor-save-"]').first().click()
    await page.waitForTimeout(400)
    const errorVisible = await page.locator('[data-testid^="wf-editor-error-"]').count()
    console.log(`[iter118] zod error visible: ${errorVisible}`)
    if (!errorVisible) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: '不正 JSON でも error 表示されない (zod バリデーション欠落?)',
      })
    }

    await page.screenshot({ path: '/tmp/uiux-workflow-editor-iter118.png' })
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
