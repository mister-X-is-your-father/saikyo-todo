/**
 * Phase 6.15 loop iter1724: src/app/page.tsx home page の logout button aria-label を
 * em-dash visible-prefix convention に migration (iter1093-1722 sweep の追従)。
 *
 * 発見した divergence:
 *   - 旧 aria-label "ログアウトしてログイン画面に戻る" は visible "ログアウト" を prefix と
 *     して持つ (voice control prefix-matching は OK) が、iter1093-1722 sweep の em-dash
 *     visible-prefix convention `<visible> — <descriptive>` と divergent。
 *   - sibling: mock-top-nav button (iter1095/1613): `ログアウト — mock-timesheet session を終了`
 *   - login-form / signup-form / FocusFormCta 等 codebase 全般が em-dash convention 着地済
 *
 * 修正 (src/app/page.tsx, 1 line 差替 + 5 line comment):
 *   aria-label を `"ログアウト — ログイン画面に戻る"` に変更。visible "ログアウト" span /
 *   className / type / data-testid 等 既存属性は不変、機能不変、voice control prefix-match
 *   も維持、shadcn 編集なし、機能追加なし。
 *
 * 副次更新: iter559 / iter560 / iter867 codify scripts の regex を新 aria-label に追従。
 *
 * 実行: pnpm tsx scripts/explore-uiux-home-logout-em-dash-iter1724.ts
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

  const homePage = readFileSync(resolve(here, '../src/app/page.tsx'), 'utf8')

  // --- 1. 新 aria-label em-dash 形式 ---
  if (!homePage.includes('aria-label="ログアウト — ログイン画面に戻る"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'src/app/page.tsx logout-btn aria-label が em-dash 形式 "ログアウト — ..." でない',
    })
  }

  // --- 2. 旧 syntax "ログアウトしてログイン画面に戻る" は撤去 (comment 中の literal は除外) ---
  //   comment 中の literal を quote 込みで残置するため、aria-label= 直後の literal だけ check。
  if (homePage.match(/aria-label="ログアウトしてログイン画面に戻る"/)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'src/app/page.tsx に旧 aria-label "ログアウトしてログイン画面に戻る" が残存',
    })
  }

  // --- 3. visible "ログアウト" span (iter867 aria-hidden 配線) 維持 ---
  if (!homePage.includes('<span aria-hidden="true">ログアウト</span>')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'src/app/page.tsx に visible <span aria-hidden="true">ログアウト</span> が無い',
    })
  }

  // --- 4. data-testid="logout-btn" / min-h-11 / type="submit" 維持 ---
  if (!homePage.includes('data-testid="logout-btn"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'src/app/page.tsx logout-btn data-testid が消えている',
    })
  }
  if (!homePage.includes('className="min-h-11"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'src/app/page.tsx logout-btn min-h-11 (44x44 tap target) が消えている',
    })
  }

  // --- 5. form action="ログアウト" + logoutAction 不変 ---
  if (!homePage.includes('aria-label="ログアウト"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'src/app/page.tsx logout form の aria-label="ログアウト" (brief) が消えている',
    })
  }

  // --- 6. sibling reference: mock-top-nav logout button em-dash 維持 (回帰 guard) ---
  const mockTopNav = readFileSync(
    resolve(here, '../src/components/mock-timesheet/mock-top-nav.tsx'),
    'utf8',
  )
  if (!mockTopNav.includes('aria-label="ログアウト — mock-timesheet session を終了"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'mock-top-nav.tsx logout button em-dash aria-label が消えている (sibling 回帰)',
    })
  }

  // --- 7. iter1723 reference invariant: signup-form displayName signup- prefix 維持 ---
  const signupForm = readFileSync(resolve(here, '../src/components/auth/signup-form.tsx'), 'utf8')
  if (
    !signupForm.includes('id="signup-displayName-hint"') ||
    !signupForm.includes('id="signup-displayName-error"')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1723 signup-form signup-displayName-* id が消えている',
    })
  }

  // --- 8. iter1722 reference invariant: mock-top-nav sessionId truncate 維持 ---
  if (!mockTopNav.includes('{sessionId.slice(0, 8)}…')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1722 mock-top-nav sessionId truncate が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — home page logout button aria-label が em-dash visible-prefix convention に migration、iter1723 / iter1722 invariant 不変',
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
