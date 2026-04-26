/**
 * Phase 6.15 loop iter 67 — Sprint 中止 button の confirm dialog 動作確認。
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
  const email = `iter67-${stamp}@example.com`
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
    ws_name: `iter67-${stamp}`,
    ws_slug: `iter67-${stamp}`,
  })
  const workspaceId = wsId as string

  const ins = await admin
    .from('sprints')
    .insert({
      workspace_id: workspaceId,
      name: 'iter67 sprint to cancel',
      start_date: '2026-05-01',
      end_date: '2026-05-14',
      status: 'planning',
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
    .select('id')
    .single()
  const sprintId = ins.data!.id

  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  // confirm() を一度 cancel (No) → 二回目で OK にしてキャンセル成立を試す
  let confirmCallCount = 0
  page.on('dialog', async (d) => {
    confirmCallCount += 1
    if (confirmCallCount === 1) await d.dismiss()
    else await d.accept()
  })
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
    await page.goto(`${BASE}/${workspaceId}/sprints`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    const cancelBtn = page.locator(`[data-testid="sprint-cancel-${sprintId}"]`)
    if ((await cancelBtn.count()) === 0) {
      findings.push({
        level: 'error',
        source: 'observation',
        message: 'sprint-cancel-<id> button が描画されない',
      })
    } else {
      // 1 回目 (dismiss): status は変わらない
      await cancelBtn.click()
      await page.waitForTimeout(800)
      const after1 = await admin.from('sprints').select('status').eq('id', sprintId).single()
      console.log(`[iter67] after dismiss: ${after1.data?.status}`)
      if (after1.data?.status !== 'planning') {
        findings.push({
          level: 'error',
          source: 'observation',
          message: '1 回目 dismiss で status が変わってしまう (confirm が効いていない)',
        })
      }
      // 2 回目 (accept): status = cancelled
      await cancelBtn.click()
      await page.waitForTimeout(1200)
      const after2 = await admin.from('sprints').select('status').eq('id', sprintId).single()
      console.log(`[iter67] after accept: ${after2.data?.status}`)
      if (after2.data?.status !== 'cancelled') {
        findings.push({
          level: 'error',
          source: 'observation',
          message: '2 回目 accept でも status が cancelled にならない',
        })
      }
    }
  } finally {
    await ctx.close()
    await browser.close()
    await admin.auth.admin.deleteUser(userId).catch(() => {})
  }

  console.log(`[iter67] confirm() called ${confirmCallCount} times`)
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
