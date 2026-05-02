/**
 * Phase 6.15 loop iter 637 (mode-D Desktop a11y) —
 * sprints-panel sprint-goal Textarea aria-label を 3-state 動的化
 * (32 input 統一達成、ゴール記述指針)。
 *
 * 課題: sprints-panel.tsx 行 280 の sprint-goal Textarea は aria-label が
 *   static "Sprint ゴール (任意、Cmd/Ctrl+Enter で作成)" のみで文字数 / 上限
 *   が aria 側で expose されない。
 *
 * fix (1 ファイル ~7 行差分、3-state):
 *   - 空欄 hint に「この Sprint で達成したいこと」 指針追加
 *   - 上限近接 / 通常 hint
 *
 * iter636 schedule-picker pattern を sprint-goal に展開、saikyo-todo 内
 * 動的 aria-label が 32 input 統一達成。
 *
 * 検証: source-side regex assert + iter515-636 invariant cross-check。
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
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )

  // 1. 空欄 hint
  if (
    /goal\.length === 0\s*\n?\s*\?\s*'Sprint ゴール \(任意、最大 500 文字、この Sprint で達成したいこと、Cmd\/Ctrl\+Enter で作成\)'/.test(
      sp,
    )
  ) {
    findings.push({ level: 'info', message: `sprint-goal 空欄 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `sprint-goal 空欄 hint なし` })
  }

  // 2. 上限近接 hint
  if (
    /goal\.length > 480\s*\n?\s*\?\s*`Sprint ゴール \(現在 \$\{goal\.length\} \/ 500 文字、上限近接、Cmd\/Ctrl\+Enter で作成\)`/.test(
      sp,
    )
  ) {
    findings.push({ level: 'info', message: `sprint-goal 上限近接 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `sprint-goal 上限近接 hint なし` })
  }

  // 3. 通常 hint
  if (
    /:\s*`Sprint ゴール \(現在 \$\{goal\.length\} \/ 500 文字、Cmd\/Ctrl\+Enter で作成\)`/.test(sp)
  ) {
    findings.push({ level: 'info', message: `sprint-goal 通常 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `sprint-goal 通常 hint なし` })
  }

  // 4. iter636 invariant: schedule-picker search 維持
  const sip = readFileSync(
    resolve(process.cwd(), 'src/components/schedule/schedule-item-picker.tsx'),
    'utf8',
  )
  if (/q\.length === 0\s*\n?\s*\?\s*'task を検索 \(タイトルで部分一致\)'/.test(sip)) {
    findings.push({ level: 'info', message: `iter636 invariant: schedule-picker search 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter636 invariant: 破壊` })
  }

  // 5. iter611 invariant: sprint-name 4-state 維持
  if (/name\.length === 0\s*\n?\s*\?\s*'Sprint 名前 \(必須、最大 100 文字\)'/.test(sp)) {
    findings.push({ level: 'info', message: `iter611 invariant: sprint-name 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter611 invariant: 破壊` })
  }

  // 6. iter605 invariant: sprint-defaults-dow 維持
  if (/aria-label=\{`Sprint 基本曜日 \(現在: \$\{DOW_JA\[dow\] \?\? dow\}曜開始\)`\}/.test(sp)) {
    findings.push({ level: 'info', message: `iter605 invariant: sprint-defaults-dow 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter605 invariant: 破壊` })
  }

  console.log(`\n=== Findings (sprint-goal-aria-iter637) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
