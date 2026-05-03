/**
 * Phase 6.15 loop iter 704 (mode-D Desktop a11y) —
 * budget-panel 編集 form footer (キャンセル / 保存) に role=group + aria-label 追加
 * (iter701-703 sweep の続き)。
 *
 * 課題: budget-panel.tsx 行 271 の編集 form footer `<div>` (キャンセル / 保存 button) は
 *   role / aria-label 無し。SR ナビでこの 2 button が「何の操作 group か」 不明。
 *
 * fix (1 ファイル ~5 行差分):
 *   - footer に `role="group"` + `aria-label="AI 月次コスト上限編集の操作 (キャンセル / 保存)"`
 *
 * iter701 (gantt summary) / iter702 (sprint-card actions) / iter703 (goal-card actions) と同 pattern。
 *
 * 検証: source-side regex assert + iter515-703 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const bp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/budget-panel.tsx'),
    'utf8',
  )

  // 1. budget-panel footer role=group + aria-label
  if (
    /role="group"\s*\n\s*aria-label="AI 月次コスト上限編集の操作 \(キャンセル \/ 保存\)"/.test(bp)
  ) {
    findings.push({ level: 'info', message: `budget-panel actions role=group + aria-label OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `budget-panel actions role=group + aria-label なし`,
    })
  }

  // 2. iter703 invariant: goal-card actions group 維持
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`Goal「\$\{goal\.title\}」のステータス操作 \(完了 \/ アーカイブ \/ 再開\)`\}/.test(
      gp,
    )
  ) {
    findings.push({ level: 'info', message: `iter703 invariant: goal-card actions 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter703 invariant: 破壊` })
  }

  // 3. iter702 invariant: sprint-card actions 維持
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`Sprint「\$\{sprint\.name\}」の操作 \(期間編集 \/ ステータス遷移 \/ Retro \/ Pre-mortem\)`\}/.test(
      sp,
    )
  ) {
    findings.push({ level: 'info', message: `iter702 invariant: sprint-card actions 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter702 invariant: 破壊` })
  }

  // 4. iter701 invariant: gantt summary group 維持
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

  // 5. iter662 invariant: items-board filter group 維持
  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  if (/role="group"\s*\n\s*aria-label="Item の絞り込み/.test(ib)) {
    findings.push({ level: 'info', message: `iter662 invariant: filter group 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter662 invariant: 破壊` })
  }

  console.log(`\n=== Findings (budget-actions-iter704) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
