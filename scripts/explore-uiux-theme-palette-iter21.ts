/**
 * Phase 6.15 loop iter 21 — Theme toggle (light/dark) + Command palette を試す。
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
  const email = `iter21-${stamp}@example.com`
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
    ws_name: `iter21-${stamp}`,
    ws_slug: `iter21-${stamp}`,
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

  try {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
    await page.locator('input#email').fill(email)
    await page.locator('input#password').fill(password)
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(`${BASE}/`, { timeout: 10_000 })
    await page.goto(`${BASE}/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    // theme 初期値
    const initialTheme = await page.evaluate(() =>
      document.documentElement.classList.contains('dark') ? 'dark' : 'light',
    )
    console.log(`[iter21] initial theme: ${initialTheme}`)

    // Theme toggle button を探す (Sun / Moon icon の button が候補)
    const themeBtn = page.locator(
      'button[aria-label*="theme" i], button[aria-label*="dark" i], button[aria-label*="light" i], button[data-testid*="theme" i]',
    )
    const themeBtnCount = await themeBtn.count()
    console.log(`[iter21] theme toggle button candidates: ${themeBtnCount}`)
    if (themeBtnCount === 0) {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message: 'theme toggle button が aria-label / data-testid で特定できない',
      })
    } else {
      await themeBtn
        .first()
        .click({ timeout: 1500 })
        .catch(() => {})
      await page.waitForTimeout(500)
      const afterToggle = await page.evaluate(() =>
        document.documentElement.classList.contains('dark') ? 'dark' : 'light',
      )
      console.log(`[iter21] after toggle: ${afterToggle}`)
      if (afterToggle === initialTheme) {
        findings.push({
          level: 'warning',
          source: 'observation',
          message: 'theme toggle button click 後 theme が変わらない',
        })
      }
      await page.screenshot({ path: '/tmp/uiux-theme-iter21-1.png', fullPage: true })
    }

    // Command palette (Cmd+K / Ctrl+K)
    await page.keyboard.press('Control+k')
    await page.waitForTimeout(500)
    const palette = await page.locator('[role="dialog"]').count()
    console.log(`[iter21] command palette dialogs after Ctrl+K: ${palette}`)
    if (palette === 0) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: 'Cmd+K (Ctrl+K) で command palette が開かない',
      })
    } else {
      await page.screenshot({ path: '/tmp/uiux-palette-iter21-2.png', fullPage: true })
      // input が focus されているか
      const focusedTag = await page.evaluate(() => document.activeElement?.tagName)
      console.log(`[iter21] palette open, active element: ${focusedTag}`)
      if (focusedTag !== 'INPUT') {
        findings.push({
          level: 'warning',
          source: 'a11y',
          message: `command palette open 後 active element が ${focusedTag} (INPUT 期待)`,
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
