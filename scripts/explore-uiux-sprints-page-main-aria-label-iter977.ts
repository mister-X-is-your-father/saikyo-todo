/**
 * Phase 6.15 loop iter 977 (mode-D Desktop a11y) — app/(workspace)/[workspaceId]/sprints/
 * page.tsx の `<main>` に aria-label="Sprint 計画 → 稼働 → 完了" を付与、SR landmark
 * nav (rotor) で page 識別可能化。
 *
 * 課題: workspace 配下の sprints/page.tsx の <main> は landmark accessible name を持たず
 *   SR landmark nav で「main」としか出ず page 識別不能。iter947 mock-timesheet/new
 *   と同 pattern (WorkspaceHeader の h1 は page 内部の構造で cross-file 参照は意図的に
 *   避ける、汎用 aria-label で page identity を SR に明示)。
 *
 * fix: page.tsx の <main> に aria-label="Sprint 計画 → 稼働 → 完了" を直接付与。
 *   subtitle "計画 → 稼働 → 完了" の text を再利用して page 文脈を表現。+1/-0 行 (1 file)。
 *   視覚 / 動作不変。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル 1 行。
 *
 * 検証: source-side regex で codify + architecture test 通過確認 (iter952 invariant)。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const target = 'src/app/(workspace)/[workspaceId]/sprints/page.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  if (!/aria-label="Sprint 計画 → 稼働 → 完了"/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: main に aria-label "Sprint 計画 → 稼働 → 完了" 不在`,
    })
  } else {
    findings.push({ level: 'info', message: `sprints page main aria-label OK` })
  }

  // iter952 invariant: main id + tabIndex
  if (!/id="main-content"/.test(src) || !/tabIndex=\{-1\}/.test(src)) {
    findings.push({ level: 'warning', message: `iter952 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter952 invariant OK` })
  }

  // iter954 invariant: auth-layout aria-label
  const authLayoutSrc = readFileSync(resolve(process.cwd(), 'src/app/(auth)/layout.tsx'), 'utf8')
  if (!/aria-label="認証 \(ログイン \/ サインアップ\)"/.test(authLayoutSrc)) {
    findings.push({ level: 'warning', message: `iter954 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter954 invariant OK` })
  }

  // iter976 invariant: comment-thread tap-target
  const commentSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/comment-thread.tsx'),
    'utf8',
  )
  const editButtonCount = (commentSrc.match(/before:-inset-3 before:content-\['']/g) ?? []).length
  if (editButtonCount < 2) {
    findings.push({ level: 'warning', message: `iter976 invariant 破壊 (${editButtonCount}/2)` })
  } else {
    findings.push({ level: 'info', message: `iter976 invariant OK (${editButtonCount} 件)` })
  }

  // iter735 invariant
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({ level: 'info', message: `iter735 invariant OK (${tceMatches.length} 箇所)` })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant 破壊` })
  }

  console.log(`\n=== Findings (sprints-page-main-aria-label-iter977) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
