/**
 * Phase 6.15 loop iter 43 — workspace view switcher の a11y を確認。
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
  const email = `iter43-${stamp}@example.com`
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
    ws_name: `iter43-${stamp}`,
    ws_slug: `iter43-${stamp}`,
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
    await page.goto(`${BASE}/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: '/tmp/uiux-view-switcher-iter43-1.png', fullPage: true })

    const switcher = page.locator('[data-testid="view-switcher"]')
    const switcherAttrs = await switcher.evaluate((el) => ({
      role: el.getAttribute('role'),
      ariaLabel: el.getAttribute('aria-label'),
    }))
    console.log('[iter43] view-switcher container:', JSON.stringify(switcherAttrs))
    if (!switcherAttrs.role) {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message: 'view-switcher 親 div に role / aria-label 抜け (filter group ではない)',
      })
    }

    const btns = ['today', 'inbox', 'kanban', 'backlog', 'gantt', 'dashboard']
    for (const v of btns) {
      const btn = page.locator(`[data-testid="view-${v}-btn"]`)
      if ((await btn.count()) === 0) continue
      const a = await btn.evaluate((el) => ({
        ariaPressed: el.getAttribute('aria-pressed'),
        ariaCurrent: el.getAttribute('aria-current'),
      }))
      if (!a.ariaPressed && !a.ariaCurrent) {
        findings.push({
          level: 'warning',
          source: 'a11y',
          message: `view-${v}-btn: 選択状態が aria-pressed / aria-current で表現されていない`,
        })
        break // 同じ問題は 1 件で十分
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
