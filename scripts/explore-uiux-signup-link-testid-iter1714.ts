/**
 * Phase 6.15 loop iter1714: signup/page.tsx CardFooter link に data-testid="login-link" 付与
 * (auth flow 両方向 test pattern 統一)。
 *
 * 発見した asymmetry:
 *   - login/page.tsx の signup-link は data-testid="signup-link" を持つ (line 34)
 *   - signup/page.tsx の login-link は data-testid 未設定 (testability gap)
 *
 * 影響: Playwright tests が login→signup と signup→login を異 pattern で書く必要が生じ、
 *   自動 a11y audit (focus-visible / aria-label / 44x44 tap target / underline / contrast 等)
 *   を双方向に展開する際に boilerplate が divergence。
 *
 * 修正 (signup/page.tsx): login-link link に `data-testid="login-link"` を 1 line 追加
 *   既存 aria-label / className / href は不変、shadcn 編集無し。
 *
 * 実行: pnpm tsx scripts/explore-uiux-signup-link-testid-iter1714.ts
 * 前提: なし (source 直読 invariant)
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

interface Finding {
  level: 'error' | 'warning' | 'info'
  source: string
  message: string
}

async function main() {
  const findings: Finding[] = []
  const here = dirname(fileURLToPath(import.meta.url))

  const signupPage = readFileSync(resolve(here, '../src/app/(auth)/signup/page.tsx'), 'utf8')
  const loginPage = readFileSync(resolve(here, '../src/app/(auth)/login/page.tsx'), 'utf8')

  // --- 1. signup page に data-testid="login-link" が付いている ---
  if (!signupPage.includes('data-testid="login-link"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'signup/page.tsx CardFooter link に data-testid="login-link" が無い',
    })
  }

  // --- 2. signup page link の aria-label は visible-prefix em-dash convention 維持 ---
  if (!signupPage.includes('aria-label="ログイン — 既にアカウントをお持ちの方はこちら"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message:
        'signup/page.tsx login-link の aria-label が visible-prefix em-dash convention でない',
    })
  }

  // --- 3. signup page link の min-h-11 (44x44 tap target) 維持 ---
  if (!signupPage.match(/href="\/login"[\s\S]{0,600}min-h-11/)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'signup/page.tsx login-link が min-h-11 (44px tap target) を満たさない',
    })
  }

  // --- 4. signup page link 内 visible span に aria-hidden="true" 維持 ---
  if (!signupPage.match(/href="\/login"[\s\S]{0,600}<span aria-hidden="true">ログイン<\/span>/)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'signup/page.tsx login-link の visible span に aria-hidden="true" が無い',
    })
  }

  // --- 5. login page の signup-link は引き続き data-testid="signup-link" を持つ (回帰 guard) ---
  if (!loginPage.includes('data-testid="signup-link"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'login/page.tsx CardFooter link の data-testid="signup-link" が消えている',
    })
  }

  // --- 6. login page link の aria-label も visible-prefix em-dash convention 維持 (対称回帰 guard) ---
  if (!loginPage.includes('aria-label="サインアップ — アカウント未作成の方はこちらから新規登録"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message:
        'login/page.tsx signup-link の aria-label が visible-prefix em-dash convention でない',
    })
  }

  // --- 7. iter1713 reference invariant: item-summary-panel 3 chip に aria-atomic="true" 維持 ---
  const itemSummaryPanel = readFileSync(
    resolve(here, '../src/components/workspace/item-summary-panel.tsx'),
    'utf8',
  )
  const ariaAtomicCount = (itemSummaryPanel.match(/aria-atomic="true"/g) ?? []).length
  if (ariaAtomicCount < 3) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `iter1713 item-summary-panel.tsx の aria-atomic="true" 件数が ${ariaAtomicCount} < 3 (regression)`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — signup/page.tsx に data-testid="login-link" 付与済、login/page.tsx の signup-link と auth flow 両方向で対称、iter1713 aria-atomic 不変',
    )
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
