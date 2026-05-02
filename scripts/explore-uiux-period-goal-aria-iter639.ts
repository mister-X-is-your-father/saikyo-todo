/**
 * Phase 6.15 loop iter 639 (mode-D Desktop a11y) —
 * personal-period-view ゴール Textarea aria-label を 3-state 動的化
 * (34 input 統一達成、period 別 hint)。
 *
 * 課題: personal-period-view.tsx 行 165 の period-goal-textarea は aria-label が
 *   `${periodLabelJa(period)}ゴール (Cmd/Ctrl+Enter で保存)` の static で
 *   文字数 / 上限が aria 側で expose されない。
 *
 * fix (1 ファイル ~9 行差分):
 *   - aria-label 3-state 動的化 (max 2000、period 別 hint で
 *     daily/weekly/monthly に応じた説明文)
 *
 * iter638 goal-desc pattern を period-goal に展開、saikyo-todo 内 動的
 * aria-label が 34 input 統一達成。
 *
 * 検証: source-side regex assert + iter515-638 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ppv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/personal-period-view.tsx'),
    'utf8',
  )

  // 1. 空欄 hint
  if (
    /draft\.length === 0\s*\n?\s*\?\s*`\$\{periodLabelJa\(period\)\}ゴール \(任意、最大 2000 文字、この\$\{periodLabelJa\(period\)\}で達成したいこと、Cmd\/Ctrl\+Enter で保存\)`/.test(
      ppv,
    )
  ) {
    findings.push({ level: 'info', message: `period-goal 空欄 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `period-goal 空欄 hint なし` })
  }

  // 2. 上限近接 hint
  if (
    /draft\.length > 1900\s*\n?\s*\?\s*`\$\{periodLabelJa\(period\)\}ゴール \(現在 \$\{draft\.length\} \/ 2000 文字、上限近接、Cmd\/Ctrl\+Enter で保存\)`/.test(
      ppv,
    )
  ) {
    findings.push({ level: 'info', message: `period-goal 上限近接 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `period-goal 上限近接 hint なし` })
  }

  // 3. 通常 hint
  if (
    /:\s*`\$\{periodLabelJa\(period\)\}ゴール \(現在 \$\{draft\.length\} \/ 2000 文字、Cmd\/Ctrl\+Enter で保存\)`/.test(
      ppv,
    )
  ) {
    findings.push({ level: 'info', message: `period-goal 通常 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `period-goal 通常 hint なし` })
  }

  // 4. iter638 invariant: goal-desc 維持
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (
    /description\.length === 0\s*\n?\s*\?\s*'Goal の説明 \(任意、最大 2000 文字、Objective の補足や背景、Cmd\/Ctrl\+Enter で作成\)'/.test(
      gp,
    )
  ) {
    findings.push({ level: 'info', message: `iter638 invariant: goal-desc 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter638 invariant: 破壊` })
  }

  // 5. iter637 invariant: sprint-goal 維持
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (
    /goal\.length === 0\s*\n?\s*\?\s*'Sprint ゴール \(任意、最大 500 文字、この Sprint で達成したいこと、Cmd\/Ctrl\+Enter で作成\)'/.test(
      sp,
    )
  ) {
    findings.push({ level: 'info', message: `iter637 invariant: sprint-goal 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter637 invariant: 破壊` })
  }

  // 6. iter618 invariant: team-context 維持
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  if (
    /draft\.length === 0\s*\n?\s*\?\s*'チームコンテキスト \(workspace 全体、最大 4000 文字、AI プロンプト末尾に inject、Cmd\/Ctrl\+Enter で保存\)'/.test(
      tce,
    )
  ) {
    findings.push({ level: 'info', message: `iter618 invariant: team-context 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter618 invariant: 破壊` })
  }

  console.log(`\n=== Findings (period-goal-aria-iter639) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
