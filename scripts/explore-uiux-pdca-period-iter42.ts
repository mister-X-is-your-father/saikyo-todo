/**
 * Phase 6.15 loop iter 42 — /pdca period toggle button の a11y を確認。
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
  const email = `iter42-${stamp}@example.com`
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
    ws_name: `iter42-${stamp}`,
    ws_slug: `iter42-${stamp}`,
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
    await page.goto(`${BASE}/${workspaceId}/pdca`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    await page.screenshot({ path: '/tmp/uiux-pdca-period-iter42-1.png', fullPage: true })

    const b30 = page.locator('[data-testid="pdca-period-30"]')
    const b90 = page.locator('[data-testid="pdca-period-90"]')
    if ((await b30.count()) > 0) {
      const a30 = await b30.evaluate((el) => ({
        ariaPressed: el.getAttribute('aria-pressed'),
        ariaCurrent: el.getAttribute('aria-current'),
      }))
      const a90 = await b90.evaluate((el) => ({
        ariaPressed: el.getAttribute('aria-pressed'),
        ariaCurrent: el.getAttribute('aria-current'),
      }))
      console.log('[iter42] pdca-period-30:', JSON.stringify(a30))
      console.log('[iter42] pdca-period-90:', JSON.stringify(a90))
      if (!a30.ariaPressed && !a30.ariaCurrent) {
        findings.push({
          level: 'warning',
          source: 'a11y',
          message: 'pdca period toggle: 選択状態が aria-pressed / aria-current で表現されていない',
        })
      }
    } else {
      console.log('[iter42] pdca-period-30 button が見つからない (PDCA panel 未描画?)')
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
