/**
 * Phase 6.15 loop iter 904 (mode-D Desktop a11y) —
 * goals-panel goal-title input aria-label を WCAG 2.5.3 (Label in Name) 適合形に変更。
 *
 * 課題: src/components/workspace/goals-panel.tsx の goal-title IMEInput は visible
 *   <Label htmlFor="goal-title">Objective (なに / なぜ)</Label> を持つが、旧 aria-label
 *   "Goal Objective (必須、最大 200 文字、なに / なぜを 1 行で)" は visible
 *   "Objective (なに / なぜ)" を含まず ("Goal Objective (必須," → 「(必須」 が直後に
 *   挿入されて「(なに / なぜ)」が aria-label の末尾でしか appear しない) substring 不適合
 *   → WCAG 2.5.3 違反 (4 case すべて: empty / blank-only / near-limit / normal)。
 *
 * fix (1 ファイル / +5-5 行差分、4 case 一括):
 *   - aria-label を `Objective (なに / なぜ): Goal の Objective、...` 形に統一し
 *     visible "Objective (なに / なぜ)" prefix 適合化
 *
 * 検証: source-side regex assert + iter902/903 invariant cross-check。
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

  // 1. empty aria-label に "Objective (なに / なぜ)" prefix
  if (/'Objective \(なに \/ なぜ\): Goal の Objective、必須、最大 200 文字、1 行で'/.test(gp)) {
    findings.push({
      level: 'info',
      message: `goal-title empty aria-label に "Objective (なに / なぜ)" prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `goal-title empty aria-label が "Objective (なに / なぜ)" prefix 不含`,
    })
  }

  // 2. blank-only aria-label
  if (
    /`Objective \(なに \/ なぜ\): Goal の Objective、現在 \$\{title\.length\} \/ 200 文字、空白のみは不正`/.test(
      gp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `goal-title blank-only aria-label に prefix 含む OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `goal-title blank-only aria-label 不含` })
  }

  // 3. near-limit aria-label
  if (
    /`Objective \(なに \/ なぜ\): Goal の Objective、現在 \$\{title\.length\} \/ 200 文字、上限近接`/.test(
      gp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `goal-title near-limit aria-label に prefix 含む OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `goal-title near-limit aria-label 不含` })
  }

  // 4. normal aria-label
  if (
    /`Objective \(なに \/ なぜ\): Goal の Objective、現在 \$\{title\.length\} \/ 200 文字`/.test(gp)
  ) {
    findings.push({
      level: 'info',
      message: `goal-title normal aria-label に prefix 含む OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `goal-title normal aria-label 不含` })
  }

  // 5. 旧 aria-label "Goal Objective (必須" 削除
  if (!/'Goal Objective \(必須、最大 200 文字、なに \/ なぜを 1 行で\)'/.test(gp)) {
    findings.push({
      level: 'info',
      message: `goal-title 旧 aria-label "Goal Objective (必須..." 削除済 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `goal-title 旧 aria-label 残存` })
  }

  // iter903 invariant: sprint-edit-start aria-label
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (/`開始 \(\$\{dayOfWeekJa\(editStart\)\}\): Sprint 開始日 \$\{editStart\}`/.test(sp)) {
    findings.push({
      level: 'info',
      message: `iter903 invariant: sprint-edit-start aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter903 invariant: sprint-edit-start 破壊` })
  }

  console.log(`\n=== Findings (goal-title-input-label-in-name-iter904) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
