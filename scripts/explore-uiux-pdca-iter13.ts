/**
 * Phase 6.15 loop iter 13 — PDCA dashboard 画面 (/<wsId>/pdca) を探索。
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
  const email = `iter13-${stamp}@example.com`
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
    ws_name: `iter13-${stamp}`,
    ws_slug: `iter13-${stamp}`,
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
  page.on('pageerror', (e) =>
    findings.push({ level: 'error', source: 'pageerror', message: String(e).slice(0, 240) }),
  )
  page.on('response', (res) => {
    if (res.status() >= 500)
      findings.push({
        level: 'error',
        source: 'network',
        message: `${res.status()} ${res.url().slice(0, 120)}`,
      })
  })

  try {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
    await page.locator('input#email').fill(email)
    await page.locator('input#password').fill(password)
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(`${BASE}/`, { timeout: 10_000 })

    const t0 = Date.now()
    await page.goto(`${BASE}/${workspaceId}/pdca`, { waitUntil: 'networkidle' })
    const navMs = Date.now() - t0
    await page.screenshot({ path: '/tmp/uiux-pdca-iter13-1.png', fullPage: true })

    const headings = await page.locator('h1, h2, h3, [data-slot=card-title]').allTextContents()
    const buttons = await page.locator('button').count()
    console.log(
      `[iter13] /pdca navigated in ${navMs}ms, headings=${JSON.stringify(headings.slice(0, 8))} buttons=${buttons}`,
    )

    // ボタンを 1 つ click (期間切替 30/90日)
    const btn30 = page.locator('button:has-text("30")').first()
    const btn90 = page.locator('button:has-text("90")').first()
    if ((await btn30.count()) > 0 && (await btn90.count()) > 0) {
      const clickStart = Date.now()
      await btn90.click({ timeout: 1500 }).catch(() => {})
      await page.waitForTimeout(500)
      console.log(`[iter13] 90 day toggle: ${Date.now() - clickStart}ms`)
      await btn30.click({ timeout: 1500 }).catch(() => {})
      await page.waitForTimeout(500)
    } else {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: '/pdca: 30/90 日切替ボタンが見当たらない',
      })
    }

    if (navMs > 3000) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: `/pdca 初回 navigation が ${navMs}ms と遅い (recharts 等の dev compile 影響?)`,
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
