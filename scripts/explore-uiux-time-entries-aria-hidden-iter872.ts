/**
 * Phase 6.15 loop iter 872 (mode-D Desktop a11y) —
 * time-entries-table Sync button + time-entries-panel empty「作成フォームへ」 button visible を
 * aria-hidden span で wrap (2 callsite).
 *
 * 課題: 2 file の time-entry 関連 button:
 *   - time-entries-table.tsx 行 141: Sync button visible 動的 "再Sync / Sync",
 *     aria-label "「{desc}」({date}) を {再}Sync" を完全含む
 *   - time-entries-panel.tsx 行 64: empty「作成フォームへ」, aria-label "稼働記録 作成フォームの
 *     『勤務日』入力欄にフォーカス"
 * 各々 aria-label が完全 content を含むのに、内側 visible は aria-hidden 無し → SR ユーザに重複読み上げ。
 * iter844-871 sweep の続編で 2 callsite 一括対応、time-entry 関連 UI の SR 経路整合性向上。
 *
 * fix (2 file ~2 行差分):
 *   - Sync button 動的 visible を <span aria-hidden="true"> で wrap
 *   - empty-state 「作成フォームへ」 を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter735-871 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tet = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/time-entries-table.tsx'),
    'utf8',
  )
  const tep = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/time-entries-panel.tsx'),
    'utf8',
  )

  // 1. Sync button 動的 visible (multi-line or single-line both OK)
  if (
    /<span aria-hidden="true">\s*\{e\.syncStatus === 'failed' \? '再Sync' : 'Sync'\}\s*<\/span>/.test(
      tet,
    )
  ) {
    findings.push({
      level: 'info',
      message: `time-entry-sync 動的 visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `time-entry-sync visible aria-hidden 未統合`,
    })
  }

  // 2. empty-state「作成フォームへ」
  if (/<span aria-hidden="true">作成フォームへ<\/span>/.test(tep)) {
    findings.push({
      level: 'info',
      message: `time-entries-empty「作成フォームへ」 visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `time-entries-empty visible aria-hidden 未統合`,
    })
  }

  // 3. aria-label 維持
  const ariaLabels = [
    /aria-label=\{[\s\S]+?`「\$\{e\.description \|\| '\(無題\)'\}」\(\$\{e\.workDate\}\) を Sync 中…`/.test(
      tet,
    ),
    /aria-label="稼働記録 作成フォームの『勤務日』入力欄にフォーカス"/.test(tep),
  ]
  if (ariaLabels.every(Boolean)) {
    findings.push({
      level: 'info',
      message: `time-entry 2 aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `time-entry aria-label regression (${ariaLabels.filter(Boolean).length}/2)`,
    })
  }

  // 4. iter871 invariant: notification-bell 2 aria-hidden
  const nb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/notification-bell.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">全て既読<\/span>/.test(nb) &&
    /<p className="text-xs leading-snug" aria-hidden="true">/.test(nb)
  ) {
    findings.push({
      level: 'info',
      message: `iter871 invariant: notification-bell aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter871 invariant: 破壊` })
  }

  // 5. iter735 invariant
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter735 invariant: team-context-editor aria-keyshortcuts 維持 OK (${tceMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant: 破壊` })
  }

  console.log(`\n=== Findings (time-entries-aria-hidden-iter872) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
