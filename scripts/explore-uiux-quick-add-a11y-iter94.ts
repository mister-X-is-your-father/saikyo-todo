/**
 * Phase 6.15 loop iter 94 — QuickAdd input の a11y 調査。
 * placeholder のみで visible label / aria-label 無し → SR で「テキスト編集ボックス」のみで
 * 何の input か伝わらない。preview chips も視覚専用。
 */
import { chromium } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const BASE = 'http://localhost:3001'
const SUPABASE_URL = 'http://127.0.0.1:54321'

interface Finding {
  level: 'error' | 'warning' | 'info'
  source: 'console' | 'pageerror' | 'a11y' | 'observation'
  message: string
}

async function main() {
  const findings: Finding[] = []
  const stamp = Date.now()
  const email = `iter94-${stamp}@example.com`
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
    ws_name: `iter94-${stamp}`,
    ws_slug: `iter94-${stamp}`,
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

    const input = page.locator('#quick-add-input')
    const ariaLabel = await input.getAttribute('aria-label')
    const ariaLabelledBy = await input.getAttribute('aria-labelledby')
    const placeholder = await input.getAttribute('placeholder')
    console.log(
      `[iter94] quick-add input: aria-label=${JSON.stringify(ariaLabel)} aria-labelledby=${JSON.stringify(ariaLabelledBy)} placeholder=${JSON.stringify(placeholder?.slice(0, 30))}`,
    )

    if (!ariaLabel && !ariaLabelledBy) {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message:
          'QuickAdd input に aria-label / aria-labelledby なし (placeholder のみ — SR で input の用途が不明)',
      })
    }

    // 入力 → preview chips が announce されるか
    await input.fill('明日 p1 牛乳')
    await page.waitForTimeout(300)
    // preview region の aria-live
    const preview = await page.locator('[data-testid="quick-add"] > div').nth(1)
    const ariaLive = await preview.getAttribute('aria-live').catch(() => null)
    console.log(`[iter94] preview region aria-live=${JSON.stringify(ariaLive)}`)
    if (!ariaLive) {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message: 'QuickAdd preview region に aria-live なし (入力中の解析結果が SR に届かない)',
      })
    }
    await page.screenshot({ path: '/tmp/uiux-quick-add-a11y-iter94.png' })
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
