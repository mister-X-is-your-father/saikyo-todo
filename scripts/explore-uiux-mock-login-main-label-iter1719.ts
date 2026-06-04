/**
 * Phase 6.15 loop iter1719: mock-login/page.tsx の main aria-labelledby を sibling pages
 * (/mock-timesheet/new, /mock-timesheet/entries) と convention 統一。
 *
 * 発見した asymmetry:
 *   - /mock-timesheet/new: main aria-labelledby="mock-new-heading" (h2 "新規送信")
 *   - /mock-timesheet/entries: main aria-labelledby="mock-entries-heading" (h2 "送信済み一覧")
 *   - /mock-timesheet/login (旧): main aria-labelledby="mock-timesheet-heading" (h1 "Mock Timesheet")
 *     → page intent ではなく app 名で main を命名、SR landmark 一覧で /login と /new が
 *       区別困難 (両方とも親 app 名で representative)
 *
 * 影響:
 *   SR で /login と /new を VoiceOver/NVDA の landmark list / page navigation で比較する際、
 *   /login の main が「Mock Timesheet」 と表示され、page-specific intent ("ログイン") が
 *   抜けて landmark 識別が困難。iter1087/1089 で /new と /entries は h2 + main aria-labelledby
 *   pattern を確立済 (h1 = app 名 / h2 = page intent / main = h2 で labelled)。/login だけ
 *   h2 に id 無 + main は h1 で labelled で convention に乗ってない。
 *
 * 修正 (src/app/mock-timesheet/login/page.tsx, 2 line + 7 line comment):
 *   - h2 "ログイン" に id="mock-login-heading" 追加
 *   - main の aria-labelledby を "mock-timesheet-heading" → "mock-login-heading" に切替
 *   - h1 "Mock Timesheet" / p id="mock-timesheet-description" / mock-login-form の
 *     aria-describedby="mock-timesheet-description" 参照は不変 (description は引き続き機能)
 *   - shadcn 編集なし、機能追加なし
 *
 *   SR landmark 一覧:
 *     - 旧: /login → main "Mock Timesheet"、/new → main "新規送信"、/entries → main "送信済み一覧"
 *     - 新: /login → main "ログイン"、/new → main "新規送信"、/entries → main "送信済み一覧"
 *     → 全 page で main = h2 page intent で命名、SR 利用者は landmark list で各 page の
 *       intent を即識別可能。
 *
 * 実行: pnpm tsx scripts/explore-uiux-mock-login-main-label-iter1719.ts
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

  const mockLoginPage = readFileSync(
    resolve(here, '../src/app/mock-timesheet/login/page.tsx'),
    'utf8',
  )
  const mockNewPage = readFileSync(resolve(here, '../src/app/mock-timesheet/new/page.tsx'), 'utf8')
  const mockEntriesPage = readFileSync(
    resolve(here, '../src/app/mock-timesheet/entries/page.tsx'),
    'utf8',
  )

  // --- 1. mock-login: main aria-labelledby が新 "mock-login-heading" に切替済 ---
  if (!mockLoginPage.includes('aria-labelledby="mock-login-heading"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'mock-login/page.tsx main aria-labelledby="mock-login-heading" が無い',
    })
  }

  // --- 2. mock-login: h2 に id="mock-login-heading" 付与済 ---
  if (!mockLoginPage.includes('id="mock-login-heading"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'mock-login/page.tsx h2 に id="mock-login-heading" が無い',
    })
  }

  // --- 3. 旧 main aria-labelledby (h1 ref) は撤去済 ---
  if (mockLoginPage.includes('aria-labelledby="mock-timesheet-heading"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'mock-login/page.tsx に旧 main aria-labelledby="mock-timesheet-heading" が残存',
    })
  }

  // --- 4. h1 と description は不変 (h1 visible / aria-describedby ref 用) ---
  if (!mockLoginPage.includes('id="mock-timesheet-heading"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'mock-login/page.tsx h1 id="mock-timesheet-heading" が消えている',
    })
  }
  if (!mockLoginPage.includes('id="mock-timesheet-description"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'mock-login/page.tsx p id="mock-timesheet-description" が消えている',
    })
  }

  // --- 5. sibling pages convention 維持 (回帰 guard) ---
  if (!mockNewPage.includes('aria-labelledby="mock-new-heading"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'mock-new/page.tsx main aria-labelledby="mock-new-heading" が消えている',
    })
  }
  if (!mockEntriesPage.includes('aria-labelledby="mock-entries-heading"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'mock-entries/page.tsx main aria-labelledby="mock-entries-heading" が消えている',
    })
  }

  // --- 6. mock-login-form の aria-describedby="mock-timesheet-description" 不変 (description は引き続き form 用) ---
  const mockLoginForm = readFileSync(
    resolve(here, '../src/components/mock-timesheet/mock-login-form.tsx'),
    'utf8',
  )
  if (!mockLoginForm.includes('aria-describedby="mock-timesheet-description"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'mock-login-form.tsx の aria-describedby="mock-timesheet-description" が消えている',
    })
  }

  // --- 7. iter1718 reference invariant: mock-top-nav logout form brief aria-label 維持 ---
  const mockTopNav = readFileSync(
    resolve(here, '../src/components/mock-timesheet/mock-top-nav.tsx'),
    'utf8',
  )
  if (!mockTopNav.includes('aria-label="ログアウト操作"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1718 mock-top-nav logout form aria-label="ログアウト操作" が消えている',
    })
  }

  // --- 8. iter1717 reference invariant: mock-login-form data-testid 維持 ---
  if (
    !mockLoginForm.includes('data-testid="mock-login-form"') ||
    !mockLoginForm.includes('data-testid="mock-login-submit"')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1717 mock-login-form data-testid 2 個のいずれかが消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — mock-login main aria-labelledby が sibling pages convention に揃った (h2 page intent で命名)、iter1718 / iter1717 invariant 不変',
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
