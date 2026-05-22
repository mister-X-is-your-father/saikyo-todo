/**
 * Phase 6.15 loop iter1089: mock-timesheet /login ページに h2 "ログイン" 追加の regression guard。
 *
 * iter1087 で /new に h2 "新規送信"、過去から /entries に h2 "送信済み一覧" がある一方、
 * /mock-timesheet/login は h1 "Mock Timesheet" (app 名) のみで h2 が無く heading hierarchy 不整合。
 * 修正: h2 "ログイン" 追加で 3 ページ全て同 hierarchy パターンに統一。
 *
 * 本 script は /mock-timesheet/login で h1 + h2 hierarchy を assert。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-mock-timesheet-login-h2-iter1089.ts
 * 前提: pnpm dev port 3001 起動済 (login は DB 不要で render 可能)
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
  if (!h1 || h1.text !== 'Mock Timesheet') {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `/login の h1 が "Mock Timesheet" でない: ${JSON.stringify(h1)}`,
    })
  }
  if (!h2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `/login に h2 が無い (/new / /entries と heading hierarchy 不整合)`,
    })
  } else if (h2.text !== 'ログイン') {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `/login の h2 が "ログイン" でない: "${h2.text}"`,
    })
  }

  await ctx.close()
  await browser.close()

  console.log('\n=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — /mock-timesheet/login に h1 + h2 hierarchy 確立 (/new / /entries と整合)')
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
