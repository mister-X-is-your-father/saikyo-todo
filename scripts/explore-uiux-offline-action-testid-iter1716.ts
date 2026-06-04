/**
 * Phase 6.15 loop iter1716: offline page の復帰アクション 2 個 (OfflineRetryButton + Link to /)
 * に data-testid="offline-retry-button" / data-testid="offline-home-link" を付与
 * (iter1714 signup login-link と対称 testability)。
 *
 * 発見した asymmetry:
 *   - login/page.tsx: signup-link に data-testid="signup-link" を持つ
 *   - signup/page.tsx (iter1714): login-link に data-testid="login-link" を持つ
 *   - offline page (retry button + home link): data-testid 未設定
 *
 * 影響: Playwright で offline page の focus order / aria-label / em-dash convention /
 *   44x44 tap target 等を自動 audit する標準 selector pattern が成立せず、auth page と
 *   offline page で test pattern が divergent。
 *
 * 修正:
 *   - retry-button.tsx: Button に data-testid="offline-retry-button" 付与 (1 line)
 *   - ~offline/page.tsx: Link に data-testid="offline-home-link" 付与 (1 line)
 *   - aria-label / className / href / visible span は全て不変、shadcn 編集なし、機能追加なし
 *
 * 実行: pnpm tsx scripts/explore-uiux-offline-action-testid-iter1716.ts
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

  const offlinePage = readFileSync(resolve(here, '../src/app/~offline/page.tsx'), 'utf8')
  const retryButton = readFileSync(resolve(here, '../src/app/~offline/retry-button.tsx'), 'utf8')

  // --- 1. retry-button に data-testid="offline-retry-button" が付いている ---
  if (!retryButton.includes('data-testid="offline-retry-button"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'retry-button.tsx に data-testid="offline-retry-button" が無い',
    })
  }

  // --- 2. retry-button の aria-label が visible-prefix em-dash convention 維持 ---
  if (
    !retryButton.includes('aria-label="再読み込みして再試行 — ページ全体を読み直して接続を回復"')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'retry-button.tsx aria-label が visible-prefix em-dash convention でない',
    })
  }

  // --- 3. retry-button の min-h-11 効果 (h-11 = 44px) 維持 ---
  if (!retryButton.includes('h-11')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'retry-button.tsx に h-11 (44px tap target) が無い',
    })
  }

  // --- 4. offline page Link に data-testid="offline-home-link" が付いている ---
  if (!offlinePage.includes('data-testid="offline-home-link"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'offline/page.tsx Link に data-testid="offline-home-link" が無い',
    })
  }

  // --- 5. offline page Link の aria-label が visible-prefix em-dash convention 維持 ---
  if (
    !offlinePage.includes(
      'aria-label="ホームに戻る — アプリの起点画面に遷移、オンライン復帰後は最新状態を表示"',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'offline/page.tsx Link aria-label が visible-prefix em-dash convention でない',
    })
  }

  // --- 6. offline page Link は prefetch={false} 維持 (offline で SW 経由でしか動かないので) ---
  if (!offlinePage.includes('prefetch={false}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'offline/page.tsx Link の prefetch={false} が消えている',
    })
  }

  // --- 7. iter1715 reference invariant: login-form login-email-error id 維持 ---
  const loginForm = readFileSync(resolve(here, '../src/components/auth/login-form.tsx'), 'utf8')
  if (
    !loginForm.includes('id="login-email-error"') ||
    !loginForm.includes('id="login-password-error"')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1715 login-form の login-email-error / login-password-error id が消えている',
    })
  }

  // --- 8. iter1714 reference invariant: signup login-link data-testid 維持 ---
  const signupPage = readFileSync(resolve(here, '../src/app/(auth)/signup/page.tsx'), 'utf8')
  if (!signupPage.includes('data-testid="login-link"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1714 signup/page.tsx login-link data-testid が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — offline 復帰アクション 2 個 (retry-button / home-link) に data-testid 付与済、iter1715 / iter1714 invariant 不変',
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
