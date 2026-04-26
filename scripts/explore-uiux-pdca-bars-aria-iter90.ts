/**
 * Phase 6.15 loop iter 90 — PDCA DailyBars の list/listitem aria 属性を確認。
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
  const email = `iter90-${stamp}@example.com`
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
    ws_name: `iter90-${stamp}`,
    ws_slug: `iter90-${stamp}`,
  })
  const workspaceId = wsId as string

  // done item を 1 件投入 (DailyBars に何かしら出る)
  await admin.from('items').insert({
    workspace_id: workspaceId,
    title: 'iter90 done',
    status: 'done',
    done_at: new Date().toISOString(),
    created_by_actor_type: 'user',
    created_by_actor_id: userId,
  })

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
    await page.waitForTimeout(1500)

    const bars = page.locator('[data-testid="pdca-daily-bars"]')
    if ((await bars.count()) === 0) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: 'pdca-daily-bars が描画されない (done item 無し?)',
      })
    } else {
      const role = await bars.evaluate((el) => el.getAttribute('role'))
      console.log(`[iter90] role: ${role}`)
      if (role !== 'list') {
        findings.push({
          level: 'warning',
          source: 'a11y',
          message: 'pdca-daily-bars に role=list が付いていない',
        })
      }
      const items = await bars.locator('[role="listitem"]').count()
      console.log(`[iter90] listitem count: ${items}`)
      if (items === 0) {
        findings.push({
          level: 'warning',
          source: 'a11y',
          message: 'pdca-daily-bars 内に role=listitem が無い',
        })
      } else {
        const a = await bars
          .locator('[role="listitem"]')
          .first()
          .evaluate((el) => el.getAttribute('aria-label'))
        console.log(`[iter90] first listitem aria-label: ${a}`)
        if (!a?.includes('完了')) {
          findings.push({
            level: 'warning',
            source: 'a11y',
            message: 'listitem aria-label に "完了" が含まれない',
          })
        }
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
