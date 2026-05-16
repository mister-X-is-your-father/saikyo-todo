/**
 * Phase 6.15 loop iter 858 (mode-D Desktop a11y) —
 * time-entry family (3 file): Submit / EmptyState / Sync button visible text を
 * aria-hidden span で wrap (一括)。
 *
 * 課題: time-entry 関連 component に visible-text-only の重複読み上げ箇所が 3 種:
 *   1. create-time-entry-form: Submit button visible "..." / "記録"
 *      aria-label "稼働記録を作成中…" / "稼働記録を作成"
 *      (visible "..." の場合 = label-in-name 不一致だが SR 重複 対策で aria-hidden 化)
 *   2. time-entries-panel: EmptyState 「作成フォームへ」 button
 *      aria-label "稼働記録 作成フォームの『勤務日』入力欄にフォーカス"
 *   3. time-entries-table: Sync (再Sync) button visible "Sync" / "再Sync"
 *      aria-label `「${desc}」(${date}) を Sync` / "...再Sync"
 *
 * fix (3 file ~3 spot):
 *   - 各 visible text を <span aria-hidden="true"> で wrap、aria-label 単独経路
 *   - 機能不変、視覚 layout 不変、shadcn 編集なし
 *   - iter800-857 sweep の続編 (time-entry family に展開)
 *
 * 検証: source-side regex assert + iter735/856/857 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  // 1. create-time-entry-form Submit button
  const cf = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/create-time-entry-form.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{create\.isPending \? '\.\.\.' : '記録'\}<\/span>/.test(cf)) {
    findings.push({
      level: 'info',
      message: `create-time-entry-form Submit button visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `create-time-entry-form Submit button visible aria-hidden 未統合`,
    })
  }
  if (/aria-label=\{create\.isPending \? '稼働記録を作成中…' : '稼働記録を作成'\}/.test(cf)) {
    findings.push({
      level: 'info',
      message: `create-time-entry-form aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `create-time-entry-form aria-label 破壊` })
  }

  // 2. time-entries-panel EmptyState 作成フォームへ button
  const tep = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/time-entries-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">作成フォームへ<\/span>/.test(tep)) {
    findings.push({
      level: 'info',
      message: `time-entries-panel 作成フォームへ button visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `time-entries-panel 作成フォームへ button visible aria-hidden 未統合`,
    })
  }
  if (/aria-label="稼働記録 作成フォームの『勤務日』入力欄にフォーカス"/.test(tep)) {
    findings.push({
      level: 'info',
      message: `time-entries-panel 作成フォームへ aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `time-entries-panel aria-label 破壊` })
  }

  // 3. time-entries-table Sync (再Sync) button
  const tet = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/time-entries-table.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">[\s\S]*?\{e\.syncStatus === 'failed' \? '再Sync' : 'Sync'\}[\s\S]*?<\/span>/.test(
      tet,
    )
  ) {
    findings.push({
      level: 'info',
      message: `time-entries-table Sync button visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `time-entries-table Sync button visible aria-hidden 未統合`,
    })
  }
  if (
    /aria-label=\{[\s\S]+?`「\$\{e\.description \|\| '\(無題\)'\}」\(\$\{e\.workDate\}\) を Sync 中…`/.test(
      tet,
    )
  ) {
    findings.push({
      level: 'info',
      message: `time-entries-table Sync aria-label (pending) 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `time-entries-table aria-label 破壊` })
  }

  // 4. data-testid 維持
  if (
    /data-testid="create-time-entry-submit"/.test(cf) &&
    /data-testid="time-entries-empty-create"/.test(tep) &&
    /data-testid=\{`time-entry-sync-\$\{e\.id\}`\}/.test(tet)
  ) {
    findings.push({
      level: 'info',
      message: `time-entry 3 button data-testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `data-testid 破壊` })
  }

  // iter857 invariant: template family aria-hidden
  const inf = readFileSync(
    resolve(process.cwd(), 'src/components/template/instantiate-form.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{mut\.isPending \? '展開中\.\.\.' : '即実行 \(Instantiate\)'\}<\/span>/.test(
      inf,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter857 invariant: instantiate-form aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter857 invariant: 破壊` })
  }

  // iter856 invariant: mock-timesheet aria-hidden
  const tn = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-top-nav.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">ログアウト<\/span>/.test(tn)) {
    findings.push({
      level: 'info',
      message: `iter856 invariant: mock-top-nav ログアウト aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter856 invariant: 破壊` })
  }

  // iter735 invariant: team-context-editor aria-keyshortcuts
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

  console.log(`\n=== Findings (time-entry-aria-hidden-iter858) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
