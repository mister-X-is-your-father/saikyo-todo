/**
 * Phase 6.15 loop iter 611 (mode-D Desktop a11y) —
 * sprints-panel sprint-name IMEInput aria-label を 4-state 動的化
 * (空欄 / 空白のみ / 通常 / 上限近接、iter610 editTitle pattern を sprint-name に展開)。
 *
 * 課題: sprints-panel.tsx 行 205-218 の sprint-name IMEInput は <Label htmlFor>
 *   のみで文字数 / 上限が aria 側で expose されない。
 *
 * fix (1 ファイル ~9 行差分):
 *   - aria-label 4-state 動的化:
 *     - 空欄: 'Sprint 名前 (必須、最大 100 文字)'
 *     - 空白のみ: `Sprint 名前 (現在 ${length} / 100 文字、空白のみは不正)`
 *     - 上限近接 (>90): `Sprint 名前 (現在 ${length} / 100 文字、上限近接)`
 *     - 通常: `Sprint 名前 (現在 ${length} / 100 文字)`
 *
 * iter610 editTitle と同 pattern (4-state、空白のみ含む)。
 *
 * 検証: source-side regex assert + iter515-610 invariant cross-check。
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
  if (/name\.length === 0\s*\n?\s*\?\s*'Sprint 名前 \(必須、最大 100 文字\)'/.test(sp)) {
    findings.push({ level: 'info', message: `sprint-name 空欄 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `sprint-name 空欄 hint なし` })
  }

  // 2. 空白のみ hint
  if (
    /name\.trim\(\) === ''\s*\n?\s*\?\s*`Sprint 名前 \(現在 \$\{name\.length\} \/ 100 文字、空白のみは不正\)`/.test(
      sp,
    )
  ) {
    findings.push({ level: 'info', message: `sprint-name 空白のみ hint OK` })
  } else {
    findings.push({ level: 'warning', message: `sprint-name 空白のみ hint なし` })
  }

  // 3. 上限近接 hint
  if (
    /name\.length > 90\s*\n?\s*\?\s*`Sprint 名前 \(現在 \$\{name\.length\} \/ 100 文字、上限近接\)`/.test(
      sp,
    )
  ) {
    findings.push({ level: 'info', message: `sprint-name 上限近接 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `sprint-name 上限近接 hint なし` })
  }

  // 4. 通常 hint
  if (/:\s*`Sprint 名前 \(現在 \$\{name\.length\} \/ 100 文字\)`/.test(sp)) {
    findings.push({ level: 'info', message: `sprint-name 通常 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `sprint-name 通常 hint なし` })
  }

  // 5. iter610 invariant: editTitle 4-state 維持
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (/title\.length === 0\s*\n?\s*\?\s*'タイトル \(必須、最大 500 文字\)'/.test(ied)) {
    findings.push({ level: 'info', message: `iter610 invariant: editTitle 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter610 invariant: 破壊` })
  }

  // 6. iter606 invariant: sprint-defaults-length 維持
  if (/length < 1 \|\| length > 90\s*\n?\s*\?\s*`Sprint 期間 \(日数\) の有効範囲は 1-90/.test(sp)) {
    findings.push({ level: 'info', message: `iter606 invariant: sprint-defaults-length 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter606 invariant: 破壊` })
  }

  console.log(`\n=== Findings (sprint-name-aria-iter611) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
