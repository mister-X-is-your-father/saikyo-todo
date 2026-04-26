/**
 * Phase 6.15 loop iter 36 — /goals 作成 form の date validation と KR form a11y を確認。
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
  const email = `iter36-${stamp}@example.com`
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
    ws_name: `iter36-${stamp}`,
    ws_slug: `iter36-${stamp}`,
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
    await page.goto(`${BASE}/${workspaceId}/goals`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: '/tmp/uiux-goals-create-iter36-1.png', fullPage: true })

    // goal-desc textarea maxLength
    const desc = await page.locator('#goal-desc').evaluate((el) => ({
      maxLength: el.getAttribute('maxlength'),
    }))
    console.log('[iter36] goal-desc:', JSON.stringify(desc))
    if (!desc.maxLength) {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message: 'goal-desc textarea に maxLength なし',
      })
    }

    // 終了 < 開始 試行
    await page.locator('#goal-title').fill('iter36 invalid goal')
    await page.locator('#goal-start').fill('2026-07-10')
    await page.locator('#goal-end').fill('2026-07-05')
    await page.locator('[data-testid="goal-create-btn"]').click()
    await page.waitForTimeout(800)
    const toast = (await page.locator('[role="status"], .sonner-toast').allTextContents()).join(
      ' / ',
    )
    console.log(`[iter36] toast after invalid date: ${toast.slice(0, 200)}`)
    if (!toast.includes('終了') && !toast.includes('開始')) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: '/goals 作成 form: 終了 < 開始 でも runtime validation 無し (toast 出ない)',
      })
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
