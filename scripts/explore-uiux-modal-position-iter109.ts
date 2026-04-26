/**
 * Phase 6.15 loop iter 109 — リスト view と Kanban view で ItemEditDialog の位置差を比較。
 * ユーザ報告: "やはりリスト表示とカンバン表示ではモーダルが違う。モーダルの出る位置が違う。"
 */
import { chromium, devices } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const BASE = 'http://localhost:3001'
const SUPABASE_URL = 'http://127.0.0.1:54321'

interface Box {
  x: number
  y: number
  width: number
  height: number
}

async function main() {
  const stamp = Date.now()
  const email = `iter109-${stamp}@example.com`
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
    ws_name: `iter109-${stamp}`,
    ws_slug: `iter109-${stamp}`,
  })
  const workspaceId = wsId as string

  const today = new Date().toISOString().slice(0, 10)
  const { data: it } = await admin
    .from('items')
    .insert({
      workspace_id: workspaceId,
      title: 'iter109 modal pos test',
      due_date: today,
      status: 'in_progress',
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
    .select('id')
    .single()
  const itemId = it!.id

  const browser = await chromium.launch({ headless: true })

  // Mobile (iPhone 13)
  const mobile = await browser.newContext({
    ...devices['iPhone 13'],
    hasTouch: true,
    isMobile: true,
  })
  const mp = await mobile.newPage()
  await mp.goto(`${BASE}/login`)
  await mp.locator('input#email').fill(email)
  await mp.locator('input#password').fill(password)
  await mp.locator('button[type="submit"]').tap()
  await mp.waitForURL(`${BASE}/`)
  // 各 view で dialog 位置測定
  const results: Record<string, Box | null> = {}
  for (const v of ['today', 'inbox', 'kanban', 'backlog']) {
    await mp.goto(`${BASE}/${workspaceId}?view=${v}&item=${itemId}`, { waitUntil: 'networkidle' })
    await mp.waitForTimeout(1500)
    const box = await mp.locator('[data-slot="dialog-content"]').first().boundingBox()
    results[v] = box
    console.log(`[mobile][${v}] dialog box: ${JSON.stringify(box)}`)
  }
  await mp.screenshot({ path: '/tmp/uiux-modal-position-iter109-kanban.png' })
  await mobile.close()

  // Desktop
  const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const dp = await desktop.newPage()
  await dp.goto(`${BASE}/login`)
  await dp.locator('input#email').fill(email)
  await dp.locator('input#password').fill(password)
  await dp.locator('button[type="submit"]').click()
  await dp.waitForURL(`${BASE}/`)
  const desktopResults: Record<string, Box | null> = {}
  for (const v of ['today', 'inbox', 'kanban', 'backlog']) {
    await dp.goto(`${BASE}/${workspaceId}?view=${v}&item=${itemId}`, { waitUntil: 'networkidle' })
    await dp.waitForTimeout(1500)
    const box = await dp.locator('[data-slot="dialog-content"]').first().boundingBox()
    desktopResults[v] = box
    console.log(`[desktop][${v}] dialog box: ${JSON.stringify(box)}`)
  }

  await browser.close()
  await admin.auth.admin.deleteUser(userId).catch(() => {})

  // 同一性チェック
  console.log('\n=== Position diff (mobile) ===')
  const ref = results['today']
  for (const v of Object.keys(results)) {
    const b = results[v]
    if (!ref || !b) continue
    const dx = b.x - ref.x
    const dy = b.y - ref.y
    const dw = b.width - ref.width
    const dh = b.height - ref.height
    console.log(`  ${v}: dx=${dx} dy=${dy} dw=${dw} dh=${dh}`)
  }
  console.log('\n=== Position diff (desktop) ===')
  const refD = desktopResults['today']
  for (const v of Object.keys(desktopResults)) {
    const b = desktopResults[v]
    if (!refD || !b) continue
    const dx = b.x - refD.x
    const dy = b.y - refD.y
    const dw = b.width - refD.width
    const dh = b.height - refD.height
    console.log(`  ${v}: dx=${dx} dy=${dy} dw=${dw} dh=${dh}`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => process.exit(0))
