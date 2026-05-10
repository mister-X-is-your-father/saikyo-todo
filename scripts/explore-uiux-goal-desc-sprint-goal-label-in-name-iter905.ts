/**
 * Phase 6.15 loop iter 905 (mode-D Desktop a11y) —
 * goals-panel goal-desc Textarea + sprints-panel sprint-goal Textarea aria-label を
 * WCAG 2.5.3 (Label in Name) 適合形に変更 (一括 2 textarea、各 3 case)。
 *
 * 課題:
 *   - goal-desc visible <Label> "説明 (任意、Cmd/Ctrl+Enter で作成)" / 旧 aria-label
 *     "Goal の説明 (任意、最大 2000 文字、Objective の補足や背景、Cmd/Ctrl+Enter で作成)" は
 *     "(任意、Cmd/Ctrl+Enter で作成)" を contiguous substring に持たない (中間に「最大 2000 文字、Objective の補足や背景、」が挿入) → WCAG 2.5.3 違反
 *   - sprint-goal visible <Label> "ゴール (任意、Cmd/Ctrl+Enter で作成)" / 旧 aria-label "Sprint ゴール (任意、最大 500 文字、この Sprint で達成したいこと、Cmd/Ctrl+Enter で作成)" → 同 root cause
 *
 * fix (2 ファイル / +6-6 行差分、2 textarea × 3 case 一括):
 *   - goal-desc aria-label: `説明 (任意、Cmd/Ctrl+Enter で作成): Goal の説明、{制約}` 形
 *   - sprint-goal aria-label: `ゴール (任意、Cmd/Ctrl+Enter で作成): Sprint ゴール、{制約}` 形
 *
 * 検証: source-side regex assert + iter903/904 invariant cross-check。
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
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )

  // 1. goal-desc aria-label に "説明 (任意、Cmd/Ctrl+Enter で作成)" prefix
  if (
    /'説明 \(任意、Cmd\/Ctrl\+Enter で作成\): Goal の説明、最大 2000 文字、Objective の補足や背景'/.test(
      gp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `goal-desc empty aria-label に visible prefix 含む OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `goal-desc empty aria-label 不含` })
  }

  // 2. goal-desc near-limit
  if (
    /`説明 \(任意、Cmd\/Ctrl\+Enter で作成\): Goal の説明、現在 \$\{description\.length\} \/ 2000 文字、上限近接`/.test(
      gp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `goal-desc near-limit aria-label に visible prefix 含む OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `goal-desc near-limit aria-label 不含` })
  }

  // 3. sprint-goal aria-label に "ゴール (任意、Cmd/Ctrl+Enter で作成)" prefix
  if (
    /'ゴール \(任意、Cmd\/Ctrl\+Enter で作成\): Sprint ゴール、最大 500 文字、この Sprint で達成したいこと'/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `sprint-goal empty aria-label に visible prefix 含む OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `sprint-goal empty aria-label 不含` })
  }

  // 4. sprint-goal near-limit
  if (
    /`ゴール \(任意、Cmd\/Ctrl\+Enter で作成\): Sprint ゴール、現在 \$\{goal\.length\} \/ 500 文字、上限近接`/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `sprint-goal near-limit aria-label に visible prefix 含む OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `sprint-goal near-limit aria-label 不含` })
  }

  // 5. 旧 aria-label "Goal の説明 (任意、最大..." 削除
  if (
    !/'Goal の説明 \(任意、最大 2000 文字、Objective の補足や背景、Cmd\/Ctrl\+Enter で作成\)'/.test(
      gp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `goal-desc 旧 aria-label 削除済 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `goal-desc 旧 aria-label 残存` })
  }
  if (
    !/'Sprint ゴール \(任意、最大 500 文字、この Sprint で達成したいこと、Cmd\/Ctrl\+Enter で作成\)'/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `sprint-goal 旧 aria-label 削除済 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `sprint-goal 旧 aria-label 残存` })
  }

  // iter904 invariant: goal-title aria-label
  if (/'Objective \(なに \/ なぜ\): Goal の Objective、必須、最大 200 文字、1 行で'/.test(gp)) {
    findings.push({
      level: 'info',
      message: `iter904 invariant: goal-title aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter904 invariant: goal-title 破壊` })
  }

  console.log(`\n=== Findings (goal-desc-sprint-goal-label-in-name-iter905) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
