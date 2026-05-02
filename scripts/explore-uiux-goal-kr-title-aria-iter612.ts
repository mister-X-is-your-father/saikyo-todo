/**
 * Phase 6.15 loop iter 612 (mode-D Desktop a11y) —
 * goals-panel goal-title + kr-title IMEInput aria-label を 4-state 動的化
 * (iter610-611 pattern を Goal / KR title 2 input にまとめて展開)。
 *
 * 課題: goals-panel.tsx 行 146-159 の goal-title と 行 717-731 の kr-title は
 *   両方とも <Label htmlFor> のみで文字数 / 上限が aria 側で expose されない。
 *
 * fix (1 ファイル ~18 行差分、2 input):
 *   - goal-title (max 200): 空欄 / 空白 / 通常 / 上限近接 (>180) の 4-state
 *   - kr-title (max 300): 空欄 / 空白 / 通常 / 上限近接 (>280) の 4-state
 *
 * iter610 editTitle / iter611 sprint-name と同 pattern。
 *
 * 検証: source-side regex assert + iter515-611 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )

  // 1. goal-title 空欄 hint
  if (
    /title\.length === 0\s*\n?\s*\?\s*'Goal Objective \(必須、最大 200 文字、なに \/ なぜを 1 行で\)'/.test(
      gp,
    )
  ) {
    findings.push({ level: 'info', message: `goal-title 空欄 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `goal-title 空欄 hint なし` })
  }

  // 2. goal-title 上限近接 hint
  if (
    /title\.length > 180\s*\n?\s*\?\s*`Goal Objective \(現在 \$\{title\.length\} \/ 200 文字、上限近接\)`/.test(
      gp,
    )
  ) {
    findings.push({ level: 'info', message: `goal-title 上限近接 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `goal-title 上限近接 hint なし` })
  }

  // 3. kr-title 空欄 hint
  if (
    /krTitle\.length === 0\s*\n?\s*\?\s*'KR タイトル \(必須、最大 300 文字、達成判定可能な数値目標が望ましい\)'/.test(
      gp,
    )
  ) {
    findings.push({ level: 'info', message: `kr-title 空欄 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `kr-title 空欄 hint なし` })
  }

  // 4. kr-title 上限近接 hint
  if (
    /krTitle\.length > 280\s*\n?\s*\?\s*`KR タイトル \(現在 \$\{krTitle\.length\} \/ 300 文字、上限近接\)`/.test(
      gp,
    )
  ) {
    findings.push({ level: 'info', message: `kr-title 上限近接 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `kr-title 上限近接 hint なし` })
  }

  // 5. iter611 invariant: sprint-name 4-state 維持
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (/name\.length === 0\s*\n?\s*\?\s*'Sprint 名前 \(必須、最大 100 文字\)'/.test(sp)) {
    findings.push({ level: 'info', message: `iter611 invariant: sprint-name 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter611 invariant: 破壊` })
  }

  // 6. iter610 invariant: editTitle 4-state 維持
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (/title\.length === 0\s*\n?\s*\?\s*'タイトル \(必須、最大 500 文字\)'/.test(ied)) {
    findings.push({ level: 'info', message: `iter610 invariant: editTitle 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter610 invariant: 破壊` })
  }

  console.log(`\n=== Findings (goal-kr-title-aria-iter612) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
