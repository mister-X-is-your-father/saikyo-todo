/**
 * Phase 6.15 loop iter1085: mock-timesheet top-nav current page indicator (aria-current="page" +
 * visual highlight) regression guard。
 *
 * iter1085 で発見した bug: MockTopNav の 「新規入力」/「入力一覧」 link は両方 variant="outline"
 * で視覚的に同一、`aria-current` も無く、SR / 視覚両方で「今どのページか」 識別不能だった。
 *
 * 修正 (mock-top-nav.tsx): 'use client' + usePathname で現在地検出、active link に
 * `aria-current="page"` + visual variant 'default' (vs 'outline') を切替。
 *
 * 本 script は mock-login (固定認証、DB 不要) → /new / /entries に遷移して active link の
 * aria-current="page" 付与を確認する regression guard。/entries は実 adminDb (DB 接続) が必要だが、
 * page render の早い段階で fail しなければ MockTopNav は描画されるので一部 attribute は読める。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-mock-timesheet-nav-current-iter1085.ts
 * 前提: pnpm dev port 3001 起動済
 */
import { chromium } from '@playwright/test'

const BASE = 'http://localhost:3001'

interface Finding {
  level: 'error' | 'warning' | 'info'
  source: string
  message: string
}

async function main() {
  const findings: Finding[] = []
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()

  // login
  await page.goto(`${BASE}/mock-timesheet/login`, { waitUntil: 'networkidle' })
  await page.locator('input#tsEmail').fill('ops@example.com')
  await page.locator('input#tsPassword').fill('password1234')
  await page.locator('button#tsLoginSubmit').click()
  await page.waitForURL(`${BASE}/mock-timesheet/new`, { timeout: 10_000 })

  // /new ページ: 新規入力 link が aria-current="page", 入力一覧 link は付与なし
  const newAtNew = await page.locator('a[href="/mock-timesheet/new"]').getAttribute('aria-current')
  const entriesAtNew = await page
    .locator('a[href="/mock-timesheet/entries"]')
    .getAttribute('aria-current')
  console.log(`/new: new aria-current=${newAtNew}, entries aria-current=${entriesAtNew}`)
  if (newAtNew !== 'page') {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `/new で 新規入力 link aria-current="${newAtNew}" (期待: "page")`,
    })
  }
  if (entriesAtNew !== null) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `/new で 入力一覧 link aria-current="${entriesAtNew}" (期待: null/undefined — non-active link)`,
    })
  }

  // /entries page は DB 接続必要で 500 になる可能性高、navigate を試みて MockTopNav の
  // aria-current が読めれば assert、500 なら skip。
  const resp = await page
    .goto(`${BASE}/mock-timesheet/entries`, { waitUntil: 'networkidle', timeout: 10_000 })
    .catch(() => null)
  const status = resp?.status() ?? 0
  console.log(`/entries status=${status}`)
  if (status === 200) {
    const newAtEntries = await page
      .locator('a[href="/mock-timesheet/new"]')
      .getAttribute('aria-current')
    const entriesAtEntries = await page
      .locator('a[href="/mock-timesheet/entries"]')
      .getAttribute('aria-current')
    console.log(
      `/entries: new aria-current=${newAtEntries}, entries aria-current=${entriesAtEntries}`,
    )
    if (entriesAtEntries !== 'page') {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `/entries で 入力一覧 link aria-current="${entriesAtEntries}" (期待: "page")`,
      })
    }
    if (newAtEntries !== null) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `/entries で 新規入力 link aria-current="${newAtEntries}" (期待: null/undefined)`,
      })
    }
  } else {
    console.log(`  /entries は DB 接続必要で ${status} — entries page の current assert は skip`)
  }

  await ctx.close()
  await browser.close()

  console.log('\n=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — MockTopNav は active link で aria-current="page" を正しく付与')
  } else {
    for (const f of findings) console.log(`  [${f.level}/${f.source}] ${f.message}`)
  }
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
