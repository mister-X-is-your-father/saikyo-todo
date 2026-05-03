/**
 * Phase 6.15 loop iter 710 (mode-D Desktop a11y) —
 * integrations-panel source-card actions row に role=group + aria-label 追加
 * (iter701-709 button group sweep の続き)。
 *
 * 課題: integrations-panel.tsx 行 147 の source card 内 actions row `<div>` (pull / 編集 /
 *   有効化切替 / 削除 button 群) は role / aria-label 無し。
 *
 * fix (1 ファイル ~5 行差分):
 *   - row に `role="group"` + dynamic `aria-label={`Source「${src.name}」の操作 (pull / 編集 / 有効化切替 / 削除)`}`
 *
 * 検証: source-side regex assert + iter515-709 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )

  // 1. source-card actions row role=group + aria-label
  if (
    /role="group"\s*\n\s*aria-label=\{`Source「\$\{src\.name\}」の操作 \(pull \/ 編集 \/ 有効化切替 \/ 削除\)`\}/.test(
      ip,
    )
  ) {
    findings.push({ level: 'info', message: `source-card actions role=group + aria-label OK` })
  } else {
    findings.push({ level: 'warning', message: `source-card actions role=group + aria-label なし` })
  }

  // 2. iter709 invariant: active-timer actions 維持
  const atp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/active-timer-panel.tsx'),
    'utf8',
  )
  if (
    /aria-label="タスクタイマーの操作 \(一時停止 \/ 再開 \/ Picture-in-Picture \/ 停止\)"/.test(atp)
  ) {
    findings.push({ level: 'info', message: `iter709 invariant: active-timer actions 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter709 invariant: 破壊` })
  }

  // 3. iter708 invariant: workflow-card actions 維持
  const wf = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`Workflow「\$\{wf\.name\}」の操作 \(実行 \/ 編集 \/ 有効化切替 \/ 削除\)`\}/.test(
      wf,
    )
  ) {
    findings.push({ level: 'info', message: `iter708 invariant: workflow-card actions 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter708 invariant: 破壊` })
  }

  // 4. iter704 invariant: budget-panel actions 維持
  const bp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/budget-panel.tsx'),
    'utf8',
  )
  if (/aria-label="AI 月次コスト上限編集の操作 \(キャンセル \/ 保存\)"/.test(bp)) {
    findings.push({ level: 'info', message: `iter704 invariant: budget-panel actions 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter704 invariant: 破壊` })
  }

  // 5. iter701 invariant: gantt-summary group 維持
  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')
  if (
    /aria-label="Gantt project summary \(表示範囲 \/ Item 数 \/ CPM 期間 \/ critical \/ baseline \/ 遅延\)"/.test(
      gv,
    )
  ) {
    findings.push({ level: 'info', message: `iter701 invariant: gantt-summary group 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter701 invariant: 破壊` })
  }

  console.log(`\n=== Findings (integrations-source-actions-iter710) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
