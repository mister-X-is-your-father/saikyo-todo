/**
 * Phase 6.15 loop iter 863 (mode-D Desktop a11y) —
 * subtasks-panel 子タスク bulk 追加 button:
 * WCAG 2.5.3 (Label in Name) 違反を修正。
 *
 * 課題: src/components/workspace/subtasks-panel.tsx の subtasks-bulk-add-btn は
 *   visible "{N} 件追加" を持つが aria-label "子タスク {N} 件をまとめて追加" は
 *   助詞 "をまとめて" 5 char を挟むため visible "{N} 件追加" は strict
 *   substring に **ならない** (= name に visible 含まれず WCAG 2.5.3 失敗、
 *   voice control「N 件追加」発話で name 一致せず)。pending visible "追加中…"
 *   は aria-label "子タスク N 件を追加中…" の substring 満たすが path 統一
 *   のため一括 wrap。
 *
 * fix (1 ファイル ~3 行差分):
 *   - visible 全 path (idle "{N} 件追加" + pending "追加中…") を
 *     <span aria-hidden="true"> で wrap、aria-label 単独経路に統一
 *     (iter844-862 同 pattern)。
 *   - aria-label の 子タスク件数 + まとめて追加 文脈は維持。
 *
 * 検証: source-side regex assert + iter735-862 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/subtasks-panel.tsx'),
    'utf8',
  )

  // 1. bulk-add visible aria-hidden
  if (
    /<span aria-hidden="true">\s*\{create\.isPending \? '追加中…' : `\$\{pendingTitleCount\} 件追加`\}\s*<\/span>/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `subtasks-bulk-add visible aria-hidden 統合 OK (2 path)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `subtasks-bulk-add visible aria-hidden 未統合`,
    })
  }

  // 2. bulk-add aria-label に「子タスク N 件をまとめて追加」 文脈維持
  if (/`子タスク \$\{pendingTitleCount\} 件をまとめて追加`/.test(sp)) {
    findings.push({
      level: 'info',
      message: `subtasks-bulk-add aria-label (まとめて追加 文脈) 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `subtasks-bulk-add aria-label 文脈破壊`,
    })
  }

  // 3. data-testid 維持
  if (/data-testid="subtasks-bulk-add-btn"/.test(sp)) {
    findings.push({
      level: 'info',
      message: `subtasks-bulk-add testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `subtasks-bulk-add testid 破壊` })
  }

  // 4. aria-keyshortcuts (Cmd/Ctrl+Enter) 維持
  if (/aria-keyshortcuts="Meta\+Enter Control\+Enter"/.test(sp)) {
    findings.push({
      level: 'info',
      message: `subtasks-bulk-add aria-keyshortcuts 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `subtasks-bulk-add aria-keyshortcuts 破壊` })
  }

  // iter862 invariant: create-time-entry-submit visible aria-hidden
  const cef = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/create-time-entry-form.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{create\.isPending \? '\.\.\.' : '記録'\}<\/span>/.test(cef)
  ) {
    findings.push({
      level: 'info',
      message: `iter862 invariant: create-time-entry-submit aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter862 invariant 破壊` })
  }

  // iter860 invariant: today-view quick-add CTA aria-hidden
  const tv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/today-view.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">クイック追加にフォーカス \(キー: q\)<\/span>/.test(tv)) {
    findings.push({
      level: 'info',
      message: `iter860 invariant: today-view quick-add aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter860 invariant 破壊` })
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

  console.log(`\n=== Findings (subtasks-bulk-add-aria-hidden-iter863) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
