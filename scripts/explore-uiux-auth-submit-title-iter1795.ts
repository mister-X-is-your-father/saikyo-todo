/**
 * Phase 6.15 loop iter1795: login-form + signup-form submit button に title 付与
 * (iter1791 comment-post / iter1793 active-timer と同 pattern を auth submit button family
 * にも展開、auth UX の sighted hover disclosure)。
 *
 * 発見した UX gap (sighted only):
 *   - src/components/auth/login-form.tsx login-submit button:
 *     visible "ログイン" / "ログイン中…" + aria-label conditional 2 path、no title
 *   - src/components/auth/signup-form.tsx signup-submit button:
 *     visible "サインアップ" / "作成中…" + aria-label conditional 2 path、no title
 *   両 button は sighted は hover で認証 mechanism context (= "メール + パスワードで認証") /
 *   action context (= "アカウントを作成") 即把握できなかった。
 *
 * 修正 (2 file 各 conditional title 追加 + 3 line comment 追加):
 *   両 <Button> に conditional `title={同 aria-label}` 付与。aria-label / disabled /
 *   data-testid / type / aria-busy 完全不変、shadcn 編集なし、機能追加なし。
 *
 * 実行: pnpm tsx scripts/explore-uiux-auth-submit-title-iter1795.ts
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

  const loginForm = readFileSync(resolve(here, '../src/components/auth/login-form.tsx'), 'utf8')
  const signupForm = readFileSync(resolve(here, '../src/components/auth/signup-form.tsx'), 'utf8')

  // --- 1. login-submit title conditional 2 path text 維持 ---
  for (const t of ["'ログイン中… — 認証処理を実行中'", "'ログイン — メール + パスワードで認証'"]) {
    if (!loginForm.includes(t)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `login-submit conditional path text ${t} が消えている`,
      })
    }
  }

  // --- 2. login-form title 件数 >= 1 (= submit conditional 1 expr) ---
  const loginTitleCount = (loginForm.match(/\btitle=\{/g) ?? []).length
  if (loginTitleCount < 1) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `login-form title 件数が ${loginTitleCount} (期待 >= 1)`,
    })
  }

  // --- 3. signup-submit title conditional 2 path text 維持 ---
  for (const t of ["'作成中… — サインアップ処理を実行中'", "'サインアップ — アカウントを作成'"]) {
    if (!signupForm.includes(t)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `signup-submit conditional path text ${t} が消えている`,
      })
    }
  }

  // --- 4. signup-form title 件数 >= 1 ---
  const signupTitleCount = (signupForm.match(/\btitle=\{/g) ?? []).length
  if (signupTitleCount < 1) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `signup-form title 件数が ${signupTitleCount} (期待 >= 1)`,
    })
  }

  // --- 5. iter1793 active-timer pause title 維持 ---
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

  // --- 6. iter1791 comment-post + quick-add submit title 維持 ---
  const thread = readFileSync(
    resolve(here, '../src/components/workspace/comment-thread.tsx'),
    'utf8',
  )
  if (!thread.includes("'投稿 — コメントを投稿 (Cmd/Ctrl+Enter でも可、@user で言及・通知)'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1791 comment-post default title が消えている',
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
      '(なし) — login-form + signup-form submit button に title 付与で auth UX sighted hover disclosure、iter1793-1777 invariant 不変',
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
