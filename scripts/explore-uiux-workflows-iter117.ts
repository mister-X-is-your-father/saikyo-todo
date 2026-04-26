/**
 * Phase 6.15 loop iter 117 — /workflows page (workflow list + create + manual trigger UI)
 * の最小動作検証。
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
  const email = `iter117-${stamp}@example.com`
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
    ws_name: `iter117-${stamp}`,
    ws_slug: `iter117-${stamp}`,
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
    await page.waitForTimeout(1500)

    // 1. パネルが描画される
    const panel = await page.locator('[data-testid="workflows-panel"]').count()
    console.log(`[iter117] workflows panel rendered: ${panel}`)
    if (!panel) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: 'workflows-panel が描画されない',
      })
    }

    // 2. 作成 form
    await page.locator('input#wf-name').fill('iter117 sample wf')
    await page.locator('textarea#wf-desc').fill('first workflow')
    await page.locator('[data-testid="wf-create-btn"]').click()
    await page.waitForTimeout(800)

    const cards = await page.locator('[data-testid^="wf-card-"]').count()
    console.log(`[iter117] workflow cards after create: ${cards}`)
    if (cards === 0) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: '作成後 workflow card が表示されない',
      })
    }

    // 3. 「実行」button: node 0 件なので エラー toast (実行ブロック)
    const runBtns = await page.locator('[data-testid^="wf-run-"]').all()
    if (runBtns.length > 0) {
      await runBtns[0]!.click()
      await page.waitForTimeout(800)
      // toast が出るか (Sonner の sonner toaster 内)
      const toastVisible = await page.locator('[data-sonner-toast]').count()
      console.log(`[iter117] toast count after run-empty: ${toastVisible}`)
    }

    // 4. 無効化 toggle
    const toggleBtns = await page.locator('[data-testid^="wf-toggle-"]').all()
    if (toggleBtns.length > 0) {
      await toggleBtns[0]!.click()
      await page.waitForTimeout(800)
      // status text が「無効」を含むか
      const cardText = await page.locator('[data-testid^="wf-card-"]').first().textContent()
      console.log(`[iter117] card after toggle: ${cardText?.slice(0, 100)}`)
      if (!cardText?.includes('無効')) {
        findings.push({
          level: 'warning',
          source: 'observation',
          message: '無効化 toggle が反映されない',
        })
      }
    }

    await page.screenshot({ path: '/tmp/uiux-workflows-iter117.png' })
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
