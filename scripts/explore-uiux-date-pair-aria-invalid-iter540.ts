/**
 * Phase 6.15 loop iter 540 (mode-D Desktop a11y) —
 * 3 form の date pair start side に aria-invalid を補完
 * (iter539 sprint-create を sprint-edit / goal-create / item-edit に水平展開、4 form 統一)。
 *
 * 課題: 3 form の startDate Input が「end < start」不正状態で aria-invalid 不在 (asymmetry):
 *   - sprints-panel.tsx 行 576-586: sprint-edit-start
 *   - goals-panel.tsx 行 161-169: goal-start
 *   - item-edit-dialog.tsx 行 506-515: editStart
 *   各 endDate 側は aria-invalid={isInvalidDateRange(...)} 持つが startDate 側のみ
 *   漏れる asymmetric pattern。
 *
 * fix (3 ファイル ~3 行差分):
 *   - 各 startDate Input に aria-invalid={isInvalidDateRange(startDate/editStart, ...)} 追加
 *
 * iter539 sprint-create pattern を 3 form に水平展開、4 form 統一達成。
 * 機能不変、視覚 layout 不変、shadcn 編集なし、Label htmlFor / id / required /
 * aria-required / max / data-testid invariant 維持。
 *
 * 検証: source-side regex assert + iter515-539 invariant cross-check。
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
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )

  // 1. sprint-edit-start aria-invalid
  if (
    /id=\{`sprint-edit-start-\$\{sprint\.id\}`\}[\s\S]*?aria-invalid=\{isInvalidDateRange\(editStart, editEnd\) \|\| undefined\}/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `sprints-panel.tsx: sprint-edit-start aria-invalid 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprints-panel.tsx: sprint-edit-start aria-invalid 不在`,
    })
  }

  // 2. goal-start aria-invalid
  if (
    /id="goal-start"[\s\S]*?aria-invalid=\{isInvalidDateRange\(startDate, endDate\) \|\| undefined\}/.test(
      gp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `goals-panel.tsx: goal-start aria-invalid 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `goals-panel.tsx: goal-start aria-invalid 不在`,
    })
  }

  // 3. editStart aria-invalid
  if (
    /id="editStart"[\s\S]*?aria-invalid=\{isInvalidDateRange\(startDate, dueDate\) \|\| undefined\}/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `item-edit-dialog.tsx: editStart aria-invalid 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `item-edit-dialog.tsx: editStart aria-invalid 不在`,
    })
  }

  // 4. iter539 invariant: sprint-create sprint-start aria-invalid 維持
  if (
    /id="sprint-start"[\s\S]*?aria-invalid=\{isInvalidDateRange\(startDate, endDate\) \|\| undefined\}/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter539 invariant: sprint-create sprint-start aria-invalid 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter539 invariant: sprint-create sprint-start aria-invalid 破壊`,
    })
  }

  // 5. iter515-538 anchor invariant (1 件)
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (/aria-label=\{\s*importsOpen\s*\?\s*`Source「\$\{src\.name\}」の Pull 履歴/.test(ip)) {
    findings.push({
      level: 'info',
      message: `iter515 invariant: integrations-panel 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter515 invariant: 破壊`,
    })
  }

  console.log(`\n=== Findings (date-pair-aria-invalid-iter540) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
