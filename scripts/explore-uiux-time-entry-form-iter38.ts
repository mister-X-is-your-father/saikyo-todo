/**
 * Phase 6.15 loop iter 38 — /time-entries の create form 探索。
 * Enter キーで submit できるか / button type / a11y を確認。
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
  const email = `iter38-${stamp}@example.com`
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
    ws_name: `iter38-${stamp}`,
    ws_slug: `iter38-${stamp}`,
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
    await page.goto(`${BASE}/${workspaceId}/time-entries`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: '/tmp/uiux-time-entry-form-iter38-1.png', fullPage: true })

    const submitBtn = page.locator('[data-testid="create-time-entry-submit"]')
    const btnAttrs = await submitBtn.evaluate((el) => ({
      type: el.getAttribute('type'),
    }))
    console.log('[iter38] submit button:', JSON.stringify(btnAttrs))
    if (btnAttrs.type === 'button') {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message:
          'time-entry create form: submit button が type="button" → Enter キーで submit 不可',
      })
    }

    // 実際に Enter キーで submit を試す
    await page.locator('#teDescription').fill('iter38 enter test')
    await page.locator('#teDescription').press('Enter')
    await page.waitForTimeout(800)
    const toast = (await page.locator('[role="status"], .sonner-toast').allTextContents()).join(
      ' / ',
    )
    console.log(`[iter38] toast after Enter: ${toast.slice(0, 200)}`)
    if (!toast.includes('稼働を記録')) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: 'time-entry: 作業内容で Enter 押下しても toast 出ない (Enter-submit が機能しない)',
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
