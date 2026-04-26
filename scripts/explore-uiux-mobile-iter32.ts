/**
 * Phase 6.15 loop iter 32 — モバイル viewport で Today / Backlog レスポンシブ確認。
 */
import { chromium, devices } from '@playwright/test'
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
  const email = `iter32-${stamp}@example.com`
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
    ws_name: `iter32-${stamp}`,
    ws_slug: `iter32-${stamp}`,
  })
  const workspaceId = wsId as string

  const browser = await chromium.launch({ headless: true })
  // iPhone 13 viewport (390 x 844)
  const ctx = await browser.newContext({ ...devices['iPhone 13'] })
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
    await page.goto(`${BASE}/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    await page.screenshot({ path: '/tmp/uiux-mobile-iter32-1-today.png', fullPage: true })

    // 横スクロール (overflow-x が body / main にあるとモバイルで崩れる)
    const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = await page.evaluate(() => window.innerWidth)
    console.log(`[iter32] mobile: viewport=${viewportWidth} body.scrollWidth=${bodyScrollWidth}`)
    if (bodyScrollWidth > viewportWidth + 4) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: `モバイル: 横スクロール発生 (body.scrollWidth=${bodyScrollWidth} > viewport=${viewportWidth})`,
      })
    }

    // 縦のみ scroll
    const heading = await page.locator('h1').first().textContent()
    console.log(`[iter32] heading: ${heading}`)
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
