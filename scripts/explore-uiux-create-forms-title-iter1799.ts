/**
 * Phase 6.15 loop iter1799: create-workspace + create-time-entry submit button に title 付与
 * (iter1795-1797 auth/mock-timesheet submit と同 pattern を creation form submit にも展開、
 * creation UX の sighted hover disclosure)。
 *
 * 発見した UX gap (sighted only):
 *   - src/components/workspace/create-workspace-form.tsx create-workspace-submit:
 *     conditional 2 path、no title
 *   - src/components/time-entry/create-time-entry-form.tsx create-time-entry-submit:
 *     conditional 2 path、no title
 *   両 button は sighted は hover で creation context 即把握できなかった。
 *
 * 修正 (2 file 各 conditional title 追加 + 2 line comment 追加):
 *   両 <Button> に conditional `title={同 aria-label}` 付与。aria-label / disabled /
 *   data-testid / type / aria-busy / className 完全不変、shadcn 編集なし、機能追加なし。
 *
 * 実行: pnpm tsx scripts/explore-uiux-create-forms-title-iter1799.ts
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

  const wsForm = readFileSync(
    resolve(here, '../src/components/workspace/create-workspace-form.tsx'),
    'utf8',
  )
  const teForm = readFileSync(
    resolve(here, '../src/components/time-entry/create-time-entry-form.tsx'),
    'utf8',
  )

  // --- 1. create-workspace-submit title 付与済 ---
  if (
    !wsForm.includes(
      "title={isPending ? '作成中… — Workspace を作成中' : '作成 — Workspace を新規作成'}",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'create-workspace-submit title が無い',
    })
  }

  // --- 2. create-time-entry-submit title 付与済 ---
  if (
    !teForm.includes("title={create.isPending ? '稼働記録を作成中…' : '記録 — 稼働記録を作成'}")
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'create-time-entry-submit title が無い',
    })
  }

  // --- 3. create-workspace form-level aria-label 維持 ---
  if (!wsForm.includes('aria-label="Workspace 作成フォーム"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'create-workspace form aria-label が消えている',
    })
  }

  // --- 4. iter1797 mock-login title 維持 ---
  const mockLogin = readFileSync(
    resolve(here, '../src/components/mock-timesheet/mock-login-form.tsx'),
    'utf8',
  )
  if (!mockLogin.includes("'ログイン — mock-timesheet email + password で認証'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1797 mock-login default title が消えている',
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
      '(なし) — create-workspace + create-time-entry submit に title 付与で creation UX sighted hover disclosure、iter1797-1777 invariant 不変',
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
