/**
 * Phase 6.15 loop iter 11 — Sprints 画面 (/<wsId>/sprints) を探索。
 *
 * - login + ws 作成
 * - Sprints ページ navigate
 * - 新規 Sprint 作成 form 観察 (a11y / required / placeholder)
 * - 空送信 / 不正期間 (start > end) で UI 反応
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
  const email = `iter11-${stamp}@example.com`
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
    ws_name: `iter11-${stamp}`,
    ws_slug: `iter11-${stamp}`,
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

    await page.goto(`${BASE}/${workspaceId}/sprints`, { waitUntil: 'networkidle' })
    await page.screenshot({ path: '/tmp/uiux-sprints-iter11-1.png', fullPage: true })

    const headings = await page.locator('h1, h2, h3').allTextContents()
    const inputs = await page.locator('input').count()
    const buttons = await page.locator('button').count()
    console.log(
      `[iter11] /sprints: inputs=${inputs} buttons=${buttons} headings=${JSON.stringify(headings.slice(0, 6))}`,
    )

    // 新規 Sprint 作成 button を探して click (disabled の最初の match を skip)
    const allNewBtns = await page
      .locator('button:has-text("新規"), button:has-text("作成"), button:has-text("New")')
      .all()
    let clicked = false
    for (const btn of allNewBtns) {
      if (await btn.isEnabled()) {
        await btn.click({ timeout: 1500 }).catch(() => {})
        clicked = true
        break
      }
    }
    console.log(`[iter11] enabled new-sprint button clicked: ${clicked}`)
    if (clicked) {
      await page.waitForTimeout(600)
      await page.screenshot({ path: '/tmp/uiux-sprints-iter11-2-form.png', fullPage: true })
      // form の input 一覧と required チェック
      const formInputs = await page.locator('input, textarea').all()
      for (const inp of formInputs) {
        const id = await inp.getAttribute('id')
        const required = await inp.getAttribute('required')
        const type = await inp.getAttribute('type')
        if (id && required === null && type !== 'submit' && type !== 'button') {
          findings.push({
            level: 'warning',
            source: 'a11y',
            message: `/sprints form: input#${id} (type=${type}) に required なし`,
          })
        }
      }

      // 空送信 (form 内の submit ボタン) — disabled の場合は finding として記録
      const submitBtn = page.locator('button[type="submit"]')
      if ((await submitBtn.count()) > 0) {
        const isEnabled = await submitBtn.first().isEnabled()
        console.log(`[iter11] submit button enabled (空状態): ${isEnabled}`)
        if (!isEnabled) {
          findings.push({
            level: 'info',
            source: 'observation',
            message:
              '/sprints form: submit ボタンが空状態で disabled (HTML5 検証が動かないため UX が劣る — required + native 検証推奨)',
          })
        } else {
          await submitBtn
            .first()
            .click({ timeout: 1000 })
            .catch(() => {})
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
