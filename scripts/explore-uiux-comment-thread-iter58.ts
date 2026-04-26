/**
 * Phase 6.15 loop iter 58 — comment-thread の textarea a11y を確認。
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
  const email = `iter58-${stamp}@example.com`
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
    ws_name: `iter58-${stamp}`,
    ws_slug: `iter58-${stamp}`,
  })
  const workspaceId = wsId as string

  const ins = await admin
    .from('items')
    .insert({
      workspace_id: workspaceId,
      title: 'iter58 comment target',
      status: 'todo',
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
    .select('id')
    .single()
  const itemId = ins.data!.id

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
    // tab to comments
    await page.locator('[data-testid="tab-comments"]').click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: '/tmp/uiux-comment-thread-iter58-1.png', fullPage: true })

    const inp = page.locator('[data-testid="comment-input"]')
    if ((await inp.count()) > 0) {
      const a = await inp.evaluate((el) => ({
        ariaLabel: el.getAttribute('aria-label'),
        ariaRequired: el.getAttribute('aria-required'),
        maxLength: el.getAttribute('maxlength'),
        required: el.hasAttribute('required'),
      }))
      console.log('[iter58] comment-input:', JSON.stringify(a))
      if (!a.ariaLabel) {
        findings.push({
          level: 'warning',
          source: 'a11y',
          message: 'comment-input textarea に aria-label 抜け (placeholder のみ)',
        })
      }
      if (!a.maxLength) {
        findings.push({
          level: 'warning',
          source: 'a11y',
          message: 'comment-input textarea に maxLength 抜け (schema 上限 10000)',
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
