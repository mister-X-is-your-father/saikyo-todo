/**
 * Phase 6.15 loop iter1087: mock-timesheet /new ページに h2 "新規送信" 追加の regression guard。
 *
 * iter1087 で発見した bug: /mock-timesheet/entries は `<h2>送信済み一覧 (N 件)</h2>` を持つ
 * 一方、/mock-timesheet/new は h2 が無く (MockTopNav 内 h1 "Mock Timesheet" のみ) heading
 * hierarchy 不整合 + SR が「今このページで何ができるか」 を visual heading として拾えなかった
 * (form aria-label "Mock Timesheet 工数送信フォーム" には到達後に分かる)。
 *
 * 修正 (src/app/mock-timesheet/new/page.tsx): h2 id="mock-new-heading" "新規送信" を追加、
 * main の aria-label を aria-labelledby="mock-new-heading" に切替で heading に集約。entries
 * 側と pair 化して visual + SR の両方で page intent 一目化。
 *
 * 本 script は mock-login → /new で h1 (Mock Timesheet) + h2 (新規送信) の heading hierarchy
 * を assert + main の aria-labelledby を assert。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-mock-timesheet-new-h2-iter1087.ts
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

  await page.goto(`${BASE}/mock-timesheet/login`, { waitUntil: 'networkidle' })
  await page.locator('input#tsEmail').fill('ops@example.com')
  await page.locator('input#tsPassword').fill('password1234')
  await page.locator('button#tsLoginSubmit').click()
  await page.waitForURL(`${BASE}/mock-timesheet/new`, { timeout: 10_000 })

  // heading hierarchy: h1 (Mock Timesheet) + h2 (新規送信)
  const headings = await page.locator('h1, h2').evaluateAll((els) =>
    els.map((el) => ({
      tag: el.tagName.toLowerCase(),
      text: (el.textContent ?? '').trim(),
      id: el.getAttribute('id'),
    })),
  )
  console.log('headings:', JSON.stringify(headings))

  const h1 = headings.find((h) => h.tag === 'h1')
  const h2 = headings.find((h) => h.tag === 'h2')
  if (!h1 || !h1.text.includes('Mock Timesheet')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `/new に h1 "Mock Timesheet" が無い: ${JSON.stringify(h1)}`,
    })
  }
  if (!h2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `/new に h2 が無い (entries 側と heading hierarchy 不整合)`,
    })
  } else if (!h2.text.includes('新規送信')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `/new の h2 が "新規送信" を含まない: "${h2.text}"`,
    })
  } else if (h2.id !== 'mock-new-heading') {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `/new の h2 id が "mock-new-heading" でない: "${h2.id}"`,
    })
  }

  // main の aria-labelledby が mock-new-heading を指しているか
  const mainAttrs = await page.locator('main#main-content').evaluate((el) => ({
    ariaLabel: el.getAttribute('aria-label'),
    ariaLabelledBy: el.getAttribute('aria-labelledby'),
  }))
  console.log('main:', JSON.stringify(mainAttrs))
  if (mainAttrs.ariaLabelledBy !== 'mock-new-heading') {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `main の aria-labelledby が "mock-new-heading" でない (${mainAttrs.ariaLabelledBy})`,
    })
  }
  // aria-label と aria-labelledby が両方残ってると AT が aria-labelledby 優先するが冗長なので
  if (mainAttrs.ariaLabel) {
    findings.push({
      level: 'warning',
      source: 'a11y',
      message: `main に aria-label と aria-labelledby が両方ある (aria-labelledby 優先で aria-label は冗長): "${mainAttrs.ariaLabel}"`,
    })
  }

  await ctx.close()
  await browser.close()

  console.log('\n=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — /new に h2 "新規送信" + main aria-labelledby が正しく設定')
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
