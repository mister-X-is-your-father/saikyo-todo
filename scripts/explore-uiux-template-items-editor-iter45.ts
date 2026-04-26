/**
 * Phase 6.15 loop iter 45 — template-items-editor の form a11y を確認。
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
  const email = `iter45-${stamp}@example.com`
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
    ws_name: `iter45-${stamp}`,
    ws_slug: `iter45-${stamp}`,
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
    await page.goto(`${BASE}/${workspaceId}/templates`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    // template-card がある場合、最初の card title button をクリックして展開
    const card = page.locator('[data-testid="template-card"]').first()
    if ((await card.count()) > 0) {
      await card.locator('button').first().click()
      await page.waitForTimeout(500)
    }
    await page.screenshot({ path: '/tmp/uiux-template-items-editor-iter45-1.png', fullPage: true })

    const editor = page.locator('[data-testid="template-items-editor"]')
    if ((await editor.count()) > 0) {
      const inputs = await editor.locator('input:not([type=hidden]), textarea').evaluateAll((els) =>
        els.map((el) => ({
          tag: el.tagName,
          type: el.getAttribute('type'),
          ariaLabel: el.getAttribute('aria-label'),
          placeholder: el.getAttribute('placeholder'),
          required: el.hasAttribute('required'),
          maxLength: el.getAttribute('maxlength'),
        })),
      )
      console.log('[iter45] template-items-editor inputs:')
      for (const i of inputs) console.log('  -', JSON.stringify(i))
      for (const i of inputs) {
        if (i.type === 'checkbox') continue // checkbox は label でラップされている前提
        if (!i.ariaLabel && !i.placeholder) {
          findings.push({
            level: 'warning',
            source: 'a11y',
            message: `template-items-editor ${i.tag}[${i.type ?? '?'}]: aria-label / placeholder どちらも無し`,
          })
        } else if (!i.ariaLabel) {
          findings.push({
            level: 'warning',
            source: 'a11y',
            message: `template-items-editor ${i.tag}[${i.type ?? '?'}]: aria-label 無し (placeholder のみで SR には不十分)`,
          })
        }
      }
    } else {
      console.log(
        '[iter45] template-items-editor が描画されていない (sample template が無い workspace?)',
      )
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
