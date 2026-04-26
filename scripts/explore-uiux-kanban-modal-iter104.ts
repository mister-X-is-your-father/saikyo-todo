/**
 * Phase 6.15 loop iter 104 — モバイル Kanban で ItemEditDialog が右に切れる問題調査。
 * Kanban は body の overflow-x で横スクロールするため、scrollLeft があると
 * fixed dialog の中央計算がズレる懸念 (実測で確認)。
 */
import { chromium, devices } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const BASE = 'http://localhost:3001'
const SUPABASE_URL = 'http://127.0.0.1:54321'

interface Finding {
  level: 'error' | 'warning' | 'info'
  source: 'console' | 'pageerror' | 'a11y' | 'observation'
  message: string
}

async function main() {
  const findings: Finding[] = []
  const stamp = Date.now()
  const email = `iter104-${stamp}@example.com`
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
    ws_name: `iter104-${stamp}`,
    ws_slug: `iter104-${stamp}`,
  })
  const workspaceId = wsId as string

  // 長い description で dialog 縦スクロールも検証
  const longDesc = Array.from({ length: 80 }, (_, i) => `行 ${i + 1}: 縦スクロール検証用`).join(
    '\n',
  )
  const { data: item } = await admin
    .from('items')
    .insert({
      workspace_id: workspaceId,
      title: 'iter104 modal test',
      description: longDesc,
      status: 'in_progress',
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
    .select('id')
    .single()
  const itemId = item!.id

  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({
    ...devices['iPhone 13'],
    hasTouch: true,
    isMobile: true,
  })
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
    await page.locator('button[type="submit"]').tap()
    await page.waitForURL(`${BASE}/`, { timeout: 10_000 })

    // Kanban view → 横スクロールが発生する
    await page.goto(`${BASE}/${workspaceId}?view=kanban&item=${itemId}`, {
      waitUntil: 'networkidle',
    })
    await page.waitForTimeout(2000)

    const viewport = page.viewportSize()!
    console.log(`[iter104] viewport: ${viewport.width}x${viewport.height}`)

    // body の scrollWidth (Kanban で横スクロール発生?)
    const bodyMetrics = await page.evaluate(() => ({
      scrollWidth: document.body.scrollWidth,
      clientWidth: document.body.clientWidth,
      scrollLeft: document.documentElement.scrollLeft || document.body.scrollLeft,
      docScrollWidth: document.documentElement.scrollWidth,
      docClientWidth: document.documentElement.clientWidth,
    }))
    console.log(`[iter104] body metrics: ${JSON.stringify(bodyMetrics)}`)

    // dialog の boundingBox を取得 (viewport を超えていないか)
    const dialog = page.locator('[data-slot="dialog-content"]').first()
    await page.waitForSelector('[data-slot="dialog-content"]', { timeout: 5000 })
    const box = await dialog.boundingBox()
    console.log(`[iter104] dialog box: ${JSON.stringify(box)}`)

    // dialog 右端が viewport を超えているか
    if (box) {
      const dialogRight = box.x + box.width
      console.log(
        `[iter104] dialog right=${dialogRight} viewport.width=${viewport.width} overflow=${dialogRight - viewport.width}`,
      )
      if (dialogRight > viewport.width + 1) {
        findings.push({
          level: 'warning',
          source: 'observation',
          message: `dialog 右端 ${dialogRight}px が viewport ${viewport.width}px を ${Math.round(dialogRight - viewport.width)}px はみ出している (Kanban 横スクロール時の症状)`,
        })
      }
      if (box.x < -1) {
        findings.push({
          level: 'warning',
          source: 'observation',
          message: `dialog 左端 ${box.x}px が viewport 外`,
        })
      }
    }

    // 横スクロールしてから再測定
    await page.evaluate(() => window.scrollTo(500, 0))
    await page.waitForTimeout(300)
    const box2 = await dialog.boundingBox()
    console.log(`[iter104] after scroll(500,0) dialog box: ${JSON.stringify(box2)}`)
    if (box2) {
      const dialogRight2 = box2.x + box2.width
      if (dialogRight2 > viewport.width + 1 || box2.x < -1) {
        findings.push({
          level: 'warning',
          source: 'observation',
          message: `横スクロール後 dialog x=${box2.x} right=${dialogRight2} (viewport ${viewport.width}) — 中央保持できていない`,
        })
      }
    }

    // 縦スクロール確認: dialog 内 scroll が動作するか
    const scrollResult = await dialog.evaluate((el) => {
      const before = el.scrollTop
      el.scrollTop = 9999
      const after = el.scrollTop
      return {
        before,
        after,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
      }
    })
    console.log(`[iter104] dialog vertical scroll: ${JSON.stringify(scrollResult)}`)
    if (
      scrollResult.scrollHeight > scrollResult.clientHeight + 5 &&
      scrollResult.after === scrollResult.before
    ) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: 'dialog overflow があるが縦スクロールが効かない',
      })
    }

    await page.screenshot({ path: '/tmp/uiux-kanban-modal-iter104.png' })
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
