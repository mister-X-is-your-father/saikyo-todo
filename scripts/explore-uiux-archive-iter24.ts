/**
 * Phase 6.15 loop iter 24 — 新規 /<wsId>/archive page を Playwright で navigate 確認。
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
  const email = `iter24-${stamp}@example.com`
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
    ws_name: `iter24-${stamp}`,
    ws_slug: `iter24-${stamp}`,
  })
  const workspaceId = wsId as string

  // archived_at 付きの items を 2 件投入 / archived 無し 1 件
  const now = new Date().toISOString()
  await admin.from('items').insert([
    {
      workspace_id: workspaceId,
      title: 'archived A',
      status: 'done',
      archived_at: now,
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    },
    {
      workspace_id: workspaceId,
      title: 'archived B (must)',
      status: 'done',
      is_must: true,
      dod: 'PASS',
      archived_at: now,
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    },
    {
      workspace_id: workspaceId,
      title: 'NOT archived',
      status: 'todo',
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    },
  ])

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
    await page.goto(`${BASE}/${workspaceId}/archive`, { waitUntil: 'networkidle' })
    const navMs = Date.now() - t0
    await page.waitForTimeout(2500)
    await page.screenshot({ path: '/tmp/uiux-archive-iter24-1.png', fullPage: true })

    const headings = await page.locator('h1, h2, h3, [data-slot=card-title]').allTextContents()
    const archiveList = await page.locator('[data-testid="archive-list"]').count()
    const archiveRows = await page.locator('[data-testid^="archive-row-"]').count()
    const archiveEmpty = await page.locator('[data-testid="archive-empty"]').count()
    console.log(
      `[iter24] archive page nav=${navMs}ms headings=${JSON.stringify(headings.slice(0, 4))}`,
    )
    console.log(`[iter24] archive-list=${archiveList} rows=${archiveRows} empty=${archiveEmpty}`)

    if (archiveList === 0 && archiveEmpty === 0) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: '/archive: archive-list / archive-empty どちらも見つからない',
      })
    }
    if (archiveRows !== 2) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: `/archive: archived items 2 件投入したが rows=${archiveRows} (期待 2)`,
      })
    }

    // workspace header から archive へのリンクが無いか確認
    const archiveLink = await page.locator('a[href*="/archive"]').count()
    console.log(`[iter24] header archive link: ${archiveLink}`)
    if (archiveLink === 0) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: 'workspace header に /archive へのリンクが無い (=この画面に辿り着けない)',
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
