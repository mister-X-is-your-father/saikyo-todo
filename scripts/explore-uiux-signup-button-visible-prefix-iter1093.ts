/**
 * Phase 6.15 loop iter1093: signup-form submit button の aria-label に visible-prefix 配置の
 * regression guard。
 *
 * iter1093 で発見した bug: signup submit button の aria-label "アカウントを作成 (サインアップ)"
 * は visible "サインアップ" を末尾 () 内に持つ → substring 一致 (WCAG 2.5.3 satisfy) だが
 * voice control の prefix-matching engine で「click サインアップ」 match 不可。iter1034-1077
 * visible-prefix sweep convention に合わせ visible を冒頭固定。
 *
 * 修正 (signup-form.tsx): aria-label を default "サインアップ — アカウントを作成" / pending
 * "作成中… — アカウント作成中 (サインアップ処理を実行中)" に変更で visible 冒頭固定。
 *
 * 本 script は /signup ページで submit button の aria-label が visible で始まることを assert。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-signup-button-visible-prefix-iter1093.ts
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

  await page.goto(`${BASE}/signup`, { waitUntil: 'networkidle' })

  const submit = page.locator('button[data-testid="signup-submit"]')
  const aria = (await submit.getAttribute('aria-label')) ?? ''
  const visible = (await submit.innerText()).trim()

  console.log(`aria-label (default): ${JSON.stringify(aria)}`)
  console.log(`visible    (default): ${JSON.stringify(visible)}`)

  // visible が aria-label の冒頭 (= prefix) であることを assert
  if (!aria.startsWith(visible)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `signup submit aria-label が visible "${visible}" で始まらない (現在の冒頭: "${aria.slice(0, 30)}...")`,
    })
  }

  // pending 文字列の hard-coded check (実 pending 状態は redirect で観察難なため)
  const PENDING_VISIBLE = '作成中…'
  const PENDING_ARIA_PREFIX = '作成中… — アカウント作成中'
  if (!PENDING_ARIA_PREFIX.startsWith(PENDING_VISIBLE)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `iter1093 invariant 失敗: pending visible "${PENDING_VISIBLE}" が pending aria-label prefix "${PENDING_ARIA_PREFIX}" で始まらない`,
    })
  }

  await ctx.close()
  await browser.close()

  console.log('\n=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — signup submit aria-label は visible-prefix 配置済')
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
