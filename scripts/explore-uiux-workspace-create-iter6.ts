/**
 * Phase 6.15 loop iter 6 — / (root) で表示される workspace 作成画面を探索。
 *
 * - admin で test user 作成 (email_confirm: true)
 * - login UI から signin
 * - / に redirect → workspace 作成 form があるか観察
 * - form 入力 → 作成 → /<wsId> へ遷移するか
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
  const email = `iter6-${stamp}@example.com`
  const password = 'password1234'

  const admin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })
  const cu = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (cu.error || !cu.data.user) throw cu.error
  const userId = cu.data.user.id
  console.log(`[iter6] created user ${userId}`)

  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()

  page.on('console', (m) => {
    const t = m.type()
    if (t === 'error' || t === 'warning') {
      findings.push({
        level: t as 'error' | 'warning',
        source: 'console',
        message: m.text().slice(0, 240),
      })
    }
  })
  page.on('pageerror', (e) =>
    findings.push({ level: 'error', source: 'pageerror', message: String(e).slice(0, 240) }),
  )
  page.on('response', (res) => {
    if (res.status() >= 500 && !res.url().startsWith('data:')) {
      findings.push({
        level: 'error',
        source: 'network',
        message: `${res.status()} ${res.url().slice(0, 120)}`,
      })
    }
  })

  try {
    // 1. /login → signin
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
    await page.locator('input#email').fill(email)
    await page.locator('input#password').fill(password)
    await page.locator('button[type="submit"]').click()
    await page.waitForLoadState('networkidle')
    console.log(`[iter6] after login url=${page.url()}`)

    // 2. / で workspace 作成画面が見えているか
    await page.screenshot({ path: '/tmp/uiux-workspace-create-iter6-1-root.png', fullPage: true })

    // workspace 作成 form の有無
    const wsNameInput = page.locator(
      'input[name="name"], input#ws-name, input[placeholder*="workspace" i], input[placeholder*="ワーク" i]',
    )
    const wsCount = await wsNameInput.count()
    if (wsCount === 0) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: '/ で workspace 名 input が見つからない',
      })
    } else {
      const placeholder = await wsNameInput.first().getAttribute('placeholder')
      const required = await wsNameInput.first().getAttribute('required')
      console.log(`[iter6] ws name input placeholder="${placeholder}" required=${required}`)
      if (required === null) {
        findings.push({
          level: 'warning',
          source: 'a11y',
          message: '/ workspace 名 input に required なし',
        })
      }
    }

    // 3. 作成 button があれば押す (なければ skip)
    const createBtn = page.locator('button:has-text("作成"), button:has-text("Create")')
    if ((await createBtn.count()) > 0 && wsCount > 0) {
      await wsNameInput.first().fill(`iter6-ws-${stamp}`)
      await createBtn.first().click()
      await page.waitForLoadState('networkidle')
      console.log(`[iter6] after create url=${page.url()}`)
      await page.screenshot({
        path: '/tmp/uiux-workspace-create-iter6-2-after.png',
        fullPage: true,
      })
      if (page.url() === `${BASE}/`) {
        findings.push({
          level: 'warning',
          source: 'observation',
          message: 'workspace 作成後も / のまま (workspace 画面に遷移すべき)',
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
