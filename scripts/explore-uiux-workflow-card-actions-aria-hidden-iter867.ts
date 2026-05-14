/**
 * Phase 6.15 loop iter 867 (mode-D Desktop a11y) —
 * workflows-panel Workflow Card action 3 button + empty-state「作成フォームへ」 visible を
 * aria-hidden span で wrap (4 callsite).
 *
 * 課題: src/components/workflow/workflows-panel.tsx の Workflow Card action 3 button:
 *   - 編集 button (行 340-350): visible "編集", aria-label "Workflow「{name}」の graph / trigger を編集"
 *   - 有効/無効 toggle button (行 351-366): visible "{enabled ? '無効化' : '有効化'}", aria-label 動的
 *   - 履歴 toggle button (行 367-387): visible "履歴", aria-label 動的 (開閉 2 state)
 * empty-state「作成フォームへ」 button (行 210-222): aria-label あり visible 無 aria-hidden
 * 計 4 callsite。各々 aria-label が完全 content を含むのに、内側 visible は aria-hidden 無し →
 * SR ユーザに重複読み上げ。iter844-866 sweep の続編で 4 callsite 一括対応、Workflow card 操作の
 * SR 経路整合性向上。
 *
 * fix (1 ファイル ~4 行差分):
 *   - 編集 / {enabled?'無効化':'有効化'} / 履歴 / 作成フォームへ を各々 <span aria-hidden="true"> で wrap
 *   - Pencil / Chevron / ChevronRight / Play / Trash icon の既存 aria-hidden 維持
 *
 * 検証: source-side regex assert + iter735-866 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )

  // 1. 編集 button visible aria-hidden span
  if (/<span aria-hidden="true">編集<\/span>/.test(wp)) {
    findings.push({
      level: 'info',
      message: `workflow-edit visible "編集" aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `workflow-edit visible aria-hidden 未統合`,
    })
  }

  // 2. 有効/無効 toggle visible aria-hidden span
  if (/<span aria-hidden="true">\{wf\.enabled \? '無効化' : '有効化'\}<\/span>/.test(wp)) {
    findings.push({
      level: 'info',
      message: `workflow-toggle visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `workflow-toggle visible aria-hidden 未統合`,
    })
  }

  // 3. 履歴 toggle visible aria-hidden span
  if (/<span aria-hidden="true">履歴<\/span>/.test(wp)) {
    findings.push({
      level: 'info',
      message: `workflow-runs-toggle visible "履歴" aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `workflow-runs-toggle visible aria-hidden 未統合`,
    })
  }

  // 4. empty-state 「作成フォームへ」 aria-hidden span
  if (/<span aria-hidden="true">作成フォームへ<\/span>/.test(wp)) {
    findings.push({
      level: 'info',
      message: `workflow-empty「作成フォームへ」 visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `workflow-empty「作成フォームへ」 visible aria-hidden 未統合`,
    })
  }

  // 5. 4 button aria-label 維持
  const ariaLabels = [
    /aria-label=\{`Workflow「\$\{wf\.name\}」の graph \/ trigger を編集`\}/.test(wp),
    /aria-label=\{[\s\S]+?`Workflow「\$\{wf\.name\}」を\$\{wf\.enabled \? '無効化' : '有効化'\}`/.test(
      wp,
    ),
    /aria-label=\{[\s\S]+?`Workflow「\$\{wf\.name\}」の実行履歴 \(直近 5 件\) を閉じる`/.test(wp),
    /aria-label="Workflow 作成フォームの『名前』入力欄にフォーカス"/.test(wp),
  ]
  if (ariaLabels.every(Boolean)) {
    findings.push({
      level: 'info',
      message: `workflow card 4 aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `workflow card aria-label regression (${ariaLabels.filter(Boolean).length}/4)`,
    })
  }

  // 6. iter866 invariant: item-edit footer 4 button aria-hidden
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{unarchive\.isPending \? '復元中…' : 'アーカイブ復元'\}<\/span>/.test(
      ied,
    ) &&
    /<span aria-hidden="true">\{archive\.isPending \? 'アーカイブ中…' : 'アーカイブ'\}<\/span>/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter866 invariant: item-edit archive aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter866 invariant: 破壊` })
  }

  // 7. iter735 invariant: team-context-editor aria-keyshortcuts
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

  console.log(`\n=== Findings (workflow-card-actions-aria-hidden-iter867) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
