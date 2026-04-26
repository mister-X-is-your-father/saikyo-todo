/**
 * Phase 6.15 loop iter 35 — /sprints の create form 探索 + invalid 期間入力。
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
  const email = `iter35-${stamp}@example.com`
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
    ws_name: `iter35-${stamp}`,
    ws_slug: `iter35-${stamp}`,
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
    await page.goto(`${BASE}/${workspaceId}/sprints`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: '/tmp/uiux-sprints-create-iter35-1.png', fullPage: true })

    // goal textarea の maxLength 確認
    const goalAttr = await page.locator('#sprint-goal').evaluate((el) => ({
      maxLength: el.getAttribute('maxlength'),
      ariaRequired: el.getAttribute('aria-required'),
    }))
    console.log('[iter35] sprint-goal:', JSON.stringify(goalAttr))
    if (!goalAttr.maxLength) {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message: 'sprint-goal textarea に maxLength なし',
      })
    }

    // 終了 < 開始 を入れて submit を試す
    await page.locator('#sprint-name').fill('iter35 invalid sprint')
    await page.locator('#sprint-start').fill('2026-06-10')
    await page.locator('#sprint-end').fill('2026-06-05')
    const endVal = await page.locator('#sprint-end').inputValue()
    const endMin = await page.locator('#sprint-end').getAttribute('min')
    console.log(`[iter35] end input value=${endVal} min=${endMin}`)
    if (endMin === '2026-06-10' && endVal === '2026-06-05') {
      // browser native validation should reject — but check submit button reaction
      await page.locator('[data-testid="sprint-create-btn"]').click()
      await page.waitForTimeout(800)
      const toastText = (
        await page.locator('[role="status"], .sonner-toast').allTextContents()
      ).join(' / ')
      console.log(`[iter35] toast after invalid submit: ${toastText.slice(0, 200)}`)
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
