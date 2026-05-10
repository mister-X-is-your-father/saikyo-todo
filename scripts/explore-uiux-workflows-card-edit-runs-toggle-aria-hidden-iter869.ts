/**
 * Phase 6.15 loop iter 869 (mode-D Desktop a11y) —
 * workflows-panel Workflow card 内 wf-edit + wf-runs-toggle button: visible text を
 * span aria-hidden で wrap (一括 campaign 拡張)。
 *
 * 課題: src/components/workflow/workflows-panel.tsx の Workflow card には:
 *   - wf-edit (visible "編集") aria-label "Workflow「{name}」の graph / trigger を編集" → 適合
 *   - wf-runs-toggle (visible "履歴") aria-label "...の実行履歴 (直近 5 件) を表示/閉じる" → 適合
 *   いずれも aria-label substring 適合だったが iter867/868 campaign 規約 (visible
 *   aria-hidden 単独経路) から外れていた。なお wf-run は既に iter838 で wrap 済、
 *   wf-delete は icon-only (visible text 無し) で対象外。
 *
 * fix (1 ファイル / +2-2 行差分、2 button 一括):
 *   - <Button>編集</Button> → <Button><span aria-hidden="true">編集</span></Button>
 *   - <Button>履歴</Button> → <Button><span aria-hidden="true">履歴</span></Button>
 *
 * 検証: source-side regex assert + iter867/868 invariant cross-check。
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

  // 1. wf-edit visible "編集" span aria-hidden
  if (
    /data-testid=\{`wf-edit-\$\{wf\.id\}`\}[\s\S]+?<span aria-hidden="true">編集<\/span>/.test(wp)
  ) {
    findings.push({
      level: 'info',
      message: `wf-edit visible "編集" span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `wf-edit visible "編集" aria-hidden 未統合`,
    })
  }

  // 2. wf-runs-toggle visible "履歴" span aria-hidden
  if (
    /data-testid=\{`wf-runs-toggle-\$\{wf\.id\}`\}[\s\S]+?<span aria-hidden="true">履歴<\/span>/.test(
      wp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `wf-runs-toggle visible "履歴" span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `wf-runs-toggle visible "履歴" aria-hidden 未統合`,
    })
  }

  // 3. wf-edit aria-label 維持
  if (/aria-label=\{`Workflow「\$\{wf\.name\}」の graph \/ trigger を編集`\}/.test(wp)) {
    findings.push({
      level: 'info',
      message: `wf-edit aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `wf-edit aria-label 破壊` })
  }

  // 4. wf-runs-toggle aria-label 両状態維持
  if (
    /Workflow「\$\{wf\.name\}」の実行履歴 \(直近 5 件\) を閉じる[\s\S]+?Workflow「\$\{wf\.name\}」の実行履歴 \(直近 5 件\) を表示/.test(
      wp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `wf-runs-toggle aria-label 両状態維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `wf-runs-toggle aria-label 破壊` })
  }

  // iter868 invariant: wf-editor footer
  if (
    /data-testid=\{`wf-editor-cancel-\$\{wf\.id\}`\}[\s\S]+?<span aria-hidden="true">キャンセル<\/span>/.test(
      wp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter868 invariant: wf-editor-cancel aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter868 invariant: wf-editor-cancel 破壊` })
  }

  // iter867 invariant: trigger preset 4 button
  const allKindsOk = ['manual', 'cron', 'item-event', 'webhook'].every((k) =>
    new RegExp(`<span aria-hidden="true">${k}</span>`).test(wp),
  )
  if (allKindsOk) {
    findings.push({
      level: 'info',
      message: `iter867 invariant: trigger preset 4 button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter867 invariant: trigger preset 破壊` })
  }

  console.log(`\n=== Findings (workflows-card-edit-runs-toggle-aria-hidden-iter869) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
