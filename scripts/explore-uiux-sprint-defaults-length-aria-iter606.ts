/**
 * Phase 6.15 loop iter 606 (mode-D Desktop a11y) —
 * sprints-panel sprint-defaults-length Input aria-label を 2-state 動的化
 * (有効値 vs 範囲外、SR ユーザに current 値と境界を expose)。
 *
 * 課題: sprints-panel.tsx 行 900-913 の sprint-defaults-length Input は aria-label が
 *   "Sprint 期間 (日数、1-90)" の static で current 値が aria 側で expose されない。
 *   aria-invalid は付くが、SR ユーザは「invalid だけ」 で「実際の current 値が
 *   何で範囲外なのか」 が分からない。
 *
 * fix (1 ファイル ~5 行差分):
 *   - aria-label 2-state 動的化:
 *     - 範囲外: `Sprint 期間 (日数) の有効範囲は 1-90、現在値 ${length} は範囲外`
 *     - 有効値: `Sprint 期間 (日数、1-90、現在: ${length} 日)`
 *
 * iter605 (sprint-defaults-dow) と pair で sprint defaults 編集 form の aria-label
 * 動的化を完成。
 *
 * 検証: source-side regex assert + iter515-605 invariant cross-check。
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

  // 1. 範囲外 hint
  if (
    /length < 1 \|\| length > 90\s*\n?\s*\?\s*`Sprint 期間 \(日数\) の有効範囲は 1-90、現在値 \$\{length\} は範囲外`/.test(
      sp,
    )
  ) {
    findings.push({ level: 'info', message: `範囲外 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `範囲外 hint なし` })
  }

  // 2. 有効値 hint
  if (/:\s*`Sprint 期間 \(日数、1-90、現在: \$\{length\} 日\)`/.test(sp)) {
    findings.push({ level: 'info', message: `有効値 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `有効値 hint なし` })
  }

  // 3. iter605 invariant: sprint-defaults-dow aria-label 維持
  if (/aria-label=\{`Sprint 基本曜日 \(現在: \$\{DOW_JA\[dow\] \?\? dow\}曜開始\)`\}/.test(sp)) {
    findings.push({ level: 'info', message: `iter605 invariant: sprint-defaults-dow 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter605 invariant: 破壊` })
  }

  // 4. iter604 invariant: editKr aria-label 維持
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{\(\(\) => \{\s*\n?\s*const current = \(krsList\.data \?\? \[\]\)\.find\(/.test(
      ied,
    )
  ) {
    findings.push({ level: 'info', message: `iter604 invariant: editKr 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter604 invariant: 破壊` })
  }

  // 5. iter603 invariant: editSprint aria-label 維持
  if (
    /aria-label=\{\(\(\) => \{\s*\n?\s*const current = \(sprintsList\.data \?\? \[\]\)\.find\(/.test(
      ied,
    )
  ) {
    findings.push({ level: 'info', message: `iter603 invariant: editSprint 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter603 invariant: 破壊` })
  }

  // 6. iter589 invariant: status filter aria-label 維持
  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  if (/statusFilter === 'todo'\s*\n?\s*\?\s*'TODO'/.test(ib)) {
    findings.push({ level: 'info', message: `iter589 invariant: status filter 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter589 invariant: 破壊` })
  }

  console.log(`\n=== Findings (sprint-defaults-length-aria-iter606) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
