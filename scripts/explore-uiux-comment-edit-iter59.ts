/**
 * Phase 6.15 loop iter 59 — comment edit mode の textarea a11y を確認。
 */
import { chromium } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const BASE = 'http://localhost:3001'
const SUPABASE_URL = 'http://127.0.0.1:54321'

interface Finding {
  level: 'error' | 'warning' | 'info'
  source: 'console' | 'pageerror' | 'network' | 'a11y' | 'observation'
  message: string
}

async function main() {
  const findings: Finding[] = []
  const stamp = Date.now()
  const email = `iter59-${stamp}@example.com`
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
    ws_name: `iter59-${stamp}`,
    ws_slug: `iter59-${stamp}`,
  })
  const workspaceId = wsId as string

  const insItem = await admin
    .from('items')
    .insert({
      workspace_id: workspaceId,
      title: 'iter59 comment-edit target',
      status: 'todo',
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
    .select('id')
    .single()
  const itemId = insItem.data!.id

  // comment は UI 経由で post させる (作成 columns が schema と異なる可能性回避)
  let commentId = ''

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
    await page.goto(`${BASE}/${workspaceId}?item=${itemId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await page.locator('[data-testid="tab-comments"]').click()
    await page.waitForTimeout(800)
    // comment を post する
    await page.locator('[data-testid="comment-input"]').fill('iter59 ui-posted body')
    await page.locator('[data-testid="comment-post"]').click()
    await page.waitForTimeout(1000)
    const editBtnFirst = page.locator('[data-testid^="comment-edit-"]').first()
    if ((await editBtnFirst.count()) > 0) {
      const tid = await editBtnFirst.getAttribute('data-testid')
      commentId = tid?.replace('comment-edit-', '') ?? ''
    }
    const editBtn = page.locator(`[data-testid="comment-edit-${commentId}"]`)
    if ((await editBtn.count()) === 0) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: '編集 button が描画されない (isOwn 判定 fail?)',
      })
    } else {
      await editBtn.click()
      await page.waitForTimeout(400)
      await page.screenshot({ path: '/tmp/uiux-comment-edit-iter59-1.png', fullPage: true })
      const inp = page.locator(`[data-testid="comment-edit-input-${commentId}"]`)
      const a = await inp.evaluate((el) => ({
        ariaLabel: el.getAttribute('aria-label'),
        maxLength: el.getAttribute('maxlength'),
        required: el.hasAttribute('required'),
      }))
      console.log('[iter59] edit textarea:', JSON.stringify(a))
      if (!a.ariaLabel || !a.maxLength) {
        findings.push({
          level: 'warning',
          source: 'a11y',
          message: 'comment-edit-input: aria-label / maxLength が想定通り設定されていない',
        })
      }
    }
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
