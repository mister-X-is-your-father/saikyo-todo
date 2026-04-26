/**
 * Phase 6.15 loop iter 8 — workspace 作成画面の探索 (iter6 で wait 不足だった分の再検証)。
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
  const email = `iter8-${stamp}@example.com`
  const password = 'password1234'
  const admin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })
  const cu = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (cu.error || !cu.data.user) throw cu.error
  const userId = cu.data.user.id

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
    // iter7 で 5s wait 必要と判明。ここは waitForURL で確実に待つ
    await page.waitForURL(`${BASE}/`, { timeout: 10_000 })
    console.log(`[iter8] arrived /; current url=${page.url()}`)
    await page.screenshot({ path: '/tmp/uiux-workspace-create-iter8-1-root.png', fullPage: true })

    // workspace 作成 form を探す (placeholder / label 部分一致)
    const allInputs = await page.locator('input').count()
    console.log(`[iter8] root page inputs: ${allInputs}`)
    const headingTexts = await page.locator('h1, h2, h3, [data-slot=card-title]').allTextContents()
    console.log(`[iter8] headings: ${JSON.stringify(headingTexts)}`)

    // workspace 名 input
    const wsNameSelectors = [
      'input[name="name"]',
      'input#ws-name',
      'input[placeholder*="ワーク" i]',
      'input[placeholder*="workspace" i]',
      'input[id*="workspace" i]',
      'input[id*="name" i]',
    ]
    let wsInput: ReturnType<typeof page.locator> | null = null
    for (const sel of wsNameSelectors) {
      const c = await page.locator(sel).count()
      if (c > 0) {
        wsInput = page.locator(sel).first()
        console.log(`[iter8] ws-name selector hit: ${sel}`)
        break
      }
    }
    if (!wsInput) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message:
          '/ root: workspace 名 input が見つからない (heading=' + headingTexts.join('|') + ')',
      })
    } else {
      const required = await wsInput.getAttribute('required')
      const placeholder = await wsInput.getAttribute('placeholder')
      const ariaLabel = await wsInput.getAttribute('aria-label')
      if (!required) {
        findings.push({
          level: 'warning',
          source: 'a11y',
          message: `/ root ws input に required なし (placeholder="${placeholder}" aria-label="${ariaLabel}")`,
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
