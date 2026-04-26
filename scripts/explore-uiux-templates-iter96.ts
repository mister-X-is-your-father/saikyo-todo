/**
 * Phase 6.15 loop iter 96 — /templates テンプレート card の disclosure pattern + 作成 form
 * native validation 抜けを確認。card expand button に aria-expanded なし、name/description に
 * required / maxLength 無し。
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
  const email = `iter96-${stamp}@example.com`
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
    ws_name: `iter96-${stamp}`,
    ws_slug: `iter96-${stamp}`,
  })
  const workspaceId = wsId as string

  // Template seed
  await admin.from('templates').insert({
    workspace_id: workspaceId,
    name: 'iter96 sample template',
    description: 'iter96 disclosure test',
    kind: 'manual',
    created_by: userId,
  })

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

    await page.goto(`${BASE}/${workspaceId}/templates`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)

    // 1. tmpl-name input: required / maxLength
    const nameInput = page.locator('input#tmpl-name')
    const nameRequired = await nameInput.getAttribute('required')
    const nameMaxLen = await nameInput.getAttribute('maxlength')
    console.log(`[iter96] tmpl-name required=${nameRequired} maxlength=${nameMaxLen}`)
    if (nameRequired === null) {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message: 'tmpl-name input に required / aria-required なし (空送信 native 検証なし)',
      })
    }
    if (nameMaxLen === null) {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message: 'tmpl-name input に maxLength なし (schema は max 200 だが UI 側未制限)',
      })
    }

    // 2. tmpl-desc textarea: maxLength
    const descTa = page.locator('textarea#tmpl-desc')
    const descMaxLen = await descTa.getAttribute('maxlength')
    console.log(`[iter96] tmpl-desc maxlength=${descMaxLen}`)

    // 3. Template card expand button aria-expanded
    const card = page.locator('[data-testid="template-card"]').first()
    const expandBtn = card.locator('button').first()
    const ariaExpanded = await expandBtn.getAttribute('aria-expanded')
    const ariaControls = await expandBtn.getAttribute('aria-controls')
    console.log(
      `[iter96] template-card expand button: aria-expanded=${JSON.stringify(ariaExpanded)} aria-controls=${JSON.stringify(ariaControls)}`,
    )
    if (ariaExpanded === null) {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message: 'template-card expand button に aria-expanded なし (disclosure pattern 不完全)',
      })
    }

    // 4. expand 動作
    await expandBtn.click()
    await page.waitForTimeout(400)
    const ariaExpandedAfter = await expandBtn.getAttribute('aria-expanded')
    console.log(`[iter96] after click aria-expanded=${JSON.stringify(ariaExpandedAfter)}`)

    await page.screenshot({ path: '/tmp/uiux-templates-iter96.png' })
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
