/**
 * Phase 6.15 loop iter 650 (mode-D Desktop a11y) —
 * tag-picker tag CommandItem aria-label を 2-state 動的化
 * (52 input 統一達成、checked 状態 expose)。
 *
 * 課題: tag-picker.tsx 行 125-143 の tag CommandItem は visible label のみで
 *   checked 状態が CheckIcon (aria-hidden) でしか判別できない。
 *
 * fix (1 ファイル ~7 行差分):
 *   - aria-label 2-state 動的化:
 *     - checked: `タグ「${t.name}」を付与中 (クリックで解除)`
 *     - unchecked: `タグ「${t.name}」を付与する`
 *
 * iter649 assignee-picker pattern を tag-picker に展開、saikyo-todo 内
 * 動的 aria-label が 52 input 統一達成。
 *
 * 検証: source-side regex assert + iter515-649 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tp = readFileSync(resolve(process.cwd(), 'src/components/workspace/tag-picker.tsx'), 'utf8')

  // 1. checked hint
  if (/checked\s*\n?\s*\?\s*`タグ「\$\{t\.name\}」を付与中 \(クリックで解除\)`/.test(tp)) {
    findings.push({ level: 'info', message: `tag checked hint OK` })
  } else {
    findings.push({ level: 'warning', message: `tag checked hint なし` })
  }

  // 2. unchecked hint
  if (/:\s*`タグ「\$\{t\.name\}」を付与する`/.test(tp)) {
    findings.push({ level: 'info', message: `tag unchecked hint OK` })
  } else {
    findings.push({ level: 'warning', message: `tag unchecked hint なし` })
  }

  // 3. iter649 invariant: assignee-picker member 維持
  const ap = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/assignee-picker.tsx'),
    'utf8',
  )
  if (/checked\s*\n?\s*\?\s*`「\$\{label\}」をアサイン中 \(クリックで解除\)`/.test(ap)) {
    findings.push({ level: 'info', message: `iter649 invariant: assignee-picker 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter649 invariant: 破壊` })
  }

  // 4. iter648 invariant: sprint-create dates 維持
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (/startDate === ''\s*\n?\s*\?\s*'Sprint 開始日 \(必須、終了日以前\)'/.test(sp)) {
    findings.push({ level: 'info', message: `iter648 invariant: sprint-create dates 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter648 invariant: 破壊` })
  }

  // 5. iter645 invariant: editDod 維持
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (
    /dod\.length === 0\s*\n?\s*\?\s*'DoD 完了条件 \(MUST item は必須、空欄では保存・done 遷移不可\)'/.test(
      ied,
    )
  ) {
    findings.push({ level: 'info', message: `iter645 invariant: editDod 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter645 invariant: 破壊` })
  }

  // 6. iter635 invariant: teCategory 維持
  const ctef = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/create-time-entry-form.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`カテゴリ \(現在: \$\{TIME_ENTRY_CATEGORIES\.find\(\(c\) => c\.key === category\)\?\.label \?\? category\}\)`\}/.test(
      ctef,
    )
  ) {
    findings.push({ level: 'info', message: `iter635 invariant: teCategory 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter635 invariant: 破壊` })
  }

  console.log(`\n=== Findings (tag-options-aria-iter650) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
