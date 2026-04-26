/**
 * Phase 6.15 loop iter 97 — Dialog 長 content スクロール確認。
 * 旧: shadcn DialogContent に max-h / overflow なし → 長い content で下部が見えず操作不能。
 * 新: max-h=[calc(100dvh-2rem)] + overflow-y-auto を Dialog 共通 CSS に追加 (修正対象)。
 */
import { chromium } from '@playwright/test'
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
  const email = `iter97-${stamp}@example.com`
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
    ws_name: `iter97-${stamp}`,
    ws_slug: `iter97-${stamp}`,
  })
  const workspaceId = wsId as string

  // 長い description で content を膨らませる
  const longDesc = Array.from({ length: 200 }, (_, i) => `行 ${i + 1}: 詳細説明テキスト`).join('\n')
  const today = new Date().toISOString().slice(0, 10)
  const { data: item } = await admin
    .from('items')
    .insert({
      workspace_id: workspaceId,
      title: 'iter97 長い item',
      description: longDesc,
      due_date: today,
      status: 'todo',
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
    .select('id')
    .single()
  const itemId = item!.id

  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 600 } })
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

    // deep link で ItemEditDialog 開く (description 200 行で確実に viewport 超過)
    await page.goto(`${BASE}/${workspaceId}?view=today&item=${itemId}`, {
      waitUntil: 'networkidle',
    })
    await page.waitForTimeout(1500)

    const dialog = page.locator('[data-slot="dialog-content"]').first()
    const box = await dialog.boundingBox()
    const computedMaxH = await dialog.evaluate((el) => getComputedStyle(el).maxHeight)
    const computedOverflow = await dialog.evaluate((el) => getComputedStyle(el).overflowY)
    console.log(
      `[iter97] dialog box=${JSON.stringify(box)} maxHeight=${computedMaxH} overflowY=${computedOverflow}`,
    )
    if (computedOverflow !== 'auto' && computedOverflow !== 'scroll') {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: `dialog overflow-y が ${computedOverflow} (auto/scroll 期待)`,
      })
    }
    if (!computedMaxH || computedMaxH === 'none') {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: 'dialog max-height が none (viewport より高い content がはみ出る)',
      })
    }
    // dialog 内部が viewport 高さ未満であること
    if (box && box.height > 600 + 1) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: `dialog height=${box.height} が viewport 600 を超えている`,
      })
    }

    // 実際に scroll 動作するか
    const scrollResult = await dialog.evaluate((el) => {
      const before = el.scrollTop
      el.scrollTop = 9999
      const after = el.scrollTop
      return { before, after, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight }
    })
    console.log(`[iter97] scroll test: ${JSON.stringify(scrollResult)}`)
    if (
      scrollResult.scrollHeight > scrollResult.clientHeight + 5 &&
      scrollResult.after === scrollResult.before
    ) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: 'dialog 内部に overflow があるが scroll しない (操作不能)',
      })
    }

    await page.screenshot({ path: '/tmp/uiux-dialog-scroll-iter97.png' })
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
