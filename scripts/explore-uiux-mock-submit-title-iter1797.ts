/**
 * Phase 6.15 loop iter1797: mock-login-form + mock-submit-form submit button に title 付与
 * (iter1795 login-submit / signup-submit と同 pattern を mock-timesheet submit family にも
 * 展開、mock-timesheet submit UX の sighted hover disclosure)。
 *
 * 発見した UX gap (sighted only):
 *   - src/components/mock-timesheet/mock-login-form.tsx mock-login-submit:
 *     visible "ログイン" / "認証中…" + aria-label conditional 2 path、no title
 *   - src/components/mock-timesheet/mock-submit-form.tsx mock-submit-action:
 *     visible "送信" / "送信中…" + aria-label conditional 2 path、no title
 *   両 button は sighted は hover で auth mechanism / 工数送信 context 即把握できなかった。
 *
 * 修正 (2 file 各 conditional title 追加 + 2 line comment 追加):
 *   両 <Button> に conditional `title={同 aria-label}` 付与。aria-label / disabled /
 *   data-testid / id / type / aria-busy / className 完全不変、shadcn 編集なし、機能追加なし。
 *
 * 実行: pnpm tsx scripts/explore-uiux-mock-submit-title-iter1797.ts
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

  const mockLogin = readFileSync(
    resolve(here, '../src/components/mock-timesheet/mock-login-form.tsx'),
    'utf8',
  )
  const mockSubmit = readFileSync(
    resolve(here, '../src/components/mock-timesheet/mock-submit-form.tsx'),
    'utf8',
  )

  // --- 1. mock-login-submit conditional 2 path text 維持 ---
  for (const t of [
    "'認証中… — mock-timesheet 認証処理を実行中'",
    "'ログイン — mock-timesheet email + password で認証'",
  ]) {
    if (!mockLogin.includes(t)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `mock-login-submit conditional path text ${t} が消えている`,
      })
    }
  }

  // --- 2. mock-login title 件数 >= 1 ---
  const mockLoginTitleCount = (mockLogin.match(/\btitle=\{/g) ?? []).length
  if (mockLoginTitleCount < 1) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `mock-login-form title 件数が ${mockLoginTitleCount} (期待 >= 1)`,
    })
  }

  // --- 3. mock-submit-action conditional 2 path text 維持 ---
  for (const t of [
    "'送信中… — mock-timesheet 工数送信処理を実行中'",
    "'送信 — 工数を送信 (mock-timesheet 入力フォーム)'",
  ]) {
    if (!mockSubmit.includes(t)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `mock-submit-action conditional path text ${t} が消えている`,
      })
    }
  }

  // --- 4. mock-submit title 件数 >= 1 ---
  const mockSubmitTitleCount = (mockSubmit.match(/\btitle=\{/g) ?? []).length
  if (mockSubmitTitleCount < 1) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `mock-submit-form title 件数が ${mockSubmitTitleCount} (期待 >= 1)`,
    })
  }

  // --- 5. iter1795 login-submit title 維持 ---
  const loginForm = readFileSync(resolve(here, '../src/components/auth/login-form.tsx'), 'utf8')
  if (!loginForm.includes("'ログイン — メール + パスワードで認証'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1795 login-submit default title が消えている',
    })
  }

  // --- 6. iter1793 active-timer pause title 維持 ---
  const timer = readFileSync(
    resolve(here, '../src/components/workspace/active-timer-panel.tsx'),
    'utf8',
  )
  if (!timer.includes('title="一時停止 — タイマーを一時停止"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1793 active-timer pause title が消えている',
    })
  }

  // --- 7. iter1779 workspace nav Goals title 維持 ---
  const wsPage = readFileSync(
    resolve(here, '../src/app/(workspace)/[workspaceId]/page.tsx'),
    'utf8',
  )
  if (!wsPage.includes('title="Goals — OKR / Goals (Objective + Key Results) ページへ移動"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1779 workspace nav Goals title が消えている',
    })
  }

  // --- 8. iter1777 view-switcher Today title 維持 ---
  const board = readFileSync(resolve(here, '../src/components/workspace/items-board.tsx'), 'utf8')
  if (!board.includes('title="Today — 今日のタスク優先順、scheduledFor=今日 + 期限近接"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1777 view-switcher Today title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — mock-login + mock-submit submit button に title 付与で mock-timesheet submit UX sighted hover disclosure、iter1795-1777 invariant 不変',
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
