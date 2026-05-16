/**
 * Phase 6.15 loop iter 866 (mode-D Desktop a11y) —
 * subtasks-panel の bulk add button visible (dynamic 2 状態) を
 * <span aria-hidden="true"> で wrap し、aria-label 単独経路に統一。
 *
 * 経緯: iter844-865 sweep の続編。subtasks-panel の bulk 追加 button は
 *   aria-label が 3 状態 (no-text / pending / 通常) の完全 content
 *   (「子タスクを追加するには改行区切りで入力してください」 / 「子タスク N 件を追加中…」 /
 *    「子タスク N 件をまとめて追加」) を含むのに visible (`{create.isPending ? '追加中…' : `${pendingTitleCount} 件追加`}`)
 *   は aria-hidden 無し → SR 二重読み上げ。
 *
 * 修正: visible text を <span aria-hidden="true"> で wrap、aria-label 単独経路に統一。
 *   既存 aria-keyshortcuts="Meta+Enter Control+Enter" 維持。
 *
 * 検証: source-side regex assert + iter735/843/849-865 invariant cross-check。
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

  // 1. visible bulk add button (dynamic 2 状態) aria-hidden
  if (
    /<span aria-hidden="true">[\s\S]+?create\.isPending \? '追加中…' : `\$\{pendingTitleCount\} 件追加`[\s\S]+?<\/span>/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `subtasks-panel bulk-add visible (dynamic 2 状態) aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `subtasks-panel bulk-add visible aria-hidden 未統合`,
    })
  }

  // 2. aria-label 完全 content 維持 (3 状態 + aria-keyshortcuts)
  const labelOk =
    /'子タスクを追加するには改行区切りで入力してください'/.test(sp) &&
    /`子タスク \$\{pendingTitleCount\} 件を追加中…`/.test(sp) &&
    /`子タスク \$\{pendingTitleCount\} 件をまとめて追加`/.test(sp) &&
    /aria-keyshortcuts="Meta\+Enter Control\+Enter"/.test(sp)
  if (labelOk) {
    findings.push({
      level: 'info',
      message: `subtasks-panel bulk-add aria-label 3 状態 + aria-keyshortcuts 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `subtasks-panel bulk-add aria-label 破壊`,
    })
  }

  // 3. data-testid + iter818 step number aria-hidden 維持
  if (
    /data-testid="subtasks-bulk-add-btn"/.test(sp) &&
    /<span aria-hidden="true">\{index \+ 1\}<\/span>/.test(sp)
  ) {
    findings.push({
      level: 'info',
      message: `subtasks-panel data-testid + iter818 step aria-hidden 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `subtasks-panel data-testid / iter818 step 破壊`,
    })
  }

  // iter865 invariant: item-edit-dialog footer 4 button
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{archive\.isPending \? 'アーカイブ中…' : 'アーカイブ'\}<\/span>/.test(
      ied,
    ) &&
    /<span aria-hidden="true">\{unarchive\.isPending \? '復元中…' : 'アーカイブ復元'\}<\/span>/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter865 invariant: item-edit-dialog footer aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter865 invariant: 破壊` })
  }

  // iter864 invariant
  const srbw = readFileSync(
    resolve(process.cwd(), 'src/components/sprint/sprint-risk-board-widget.tsx'),
    'utf8',
  )
  if (
    /<span[\s\S]+?className="flex-1 truncate text-sm"[\s\S]+?aria-hidden="true"[\s\S]+?>\s*\{entry\.item\.title\}/.test(
      srbw,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter864 invariant: sprint-risk-board titleEl aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter864 invariant: 破壊` })
  }

  // iter735 invariant
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

  console.log(`\n=== Findings (subtasks-bulk-add-aria-hidden-iter866) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
