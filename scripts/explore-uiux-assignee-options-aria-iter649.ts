/**
 * Phase 6.15 loop iter 649 (mode-D Desktop a11y) —
 * assignee-picker member + agent CommandItem aria-label を 2-state 動的化
 * (51 input 統一達成、checked 状態 expose)。
 *
 * 課題: assignee-picker.tsx 行 121-135 (member) + 行 145-160 (agent) の CommandItem
 *   は visible label のみで checked 状態が CheckIcon (aria-hidden) でしか判別できない。
 *   SR ユーザは「現在 アサイン中 か」 が分からない。
 *
 * fix (1 ファイル ~14 行差分、2 CommandItem):
 *   - member: 「アサイン中 (クリックで解除)」 / 「アサインする」 で 2-state
 *   - agent: 「AI Agent「label」アサイン中 (クリックで解除)」 / 「AI Agent label をアサインする」
 *
 * iter648 sprint-create-dates pattern を CommandItem に展開、saikyo-todo 内
 * 動的 aria-label が 51 input 統一達成。
 *
 * 検証: source-side regex assert + iter515-648 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ap = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/assignee-picker.tsx'),
    'utf8',
  )

  // 1. member checked hint
  if (/checked\s*\n?\s*\?\s*`「\$\{label\}」をアサイン中 \(クリックで解除\)`/.test(ap)) {
    findings.push({ level: 'info', message: `member checked hint OK` })
  } else {
    findings.push({ level: 'warning', message: `member checked hint なし` })
  }

  // 2. member unchecked hint
  if (/:\s*`「\$\{label\}」をアサインする`/.test(ap)) {
    findings.push({ level: 'info', message: `member unchecked hint OK` })
  } else {
    findings.push({ level: 'warning', message: `member unchecked hint なし` })
  }

  // 3. agent checked hint
  if (/checked\s*\n?\s*\?\s*`AI Agent「\$\{label\}」をアサイン中 \(クリックで解除\)`/.test(ap)) {
    findings.push({ level: 'info', message: `agent checked hint OK` })
  } else {
    findings.push({ level: 'warning', message: `agent checked hint なし` })
  }

  // 4. agent unchecked hint
  if (/:\s*`AI Agent「\$\{label\}」をアサインする`/.test(ap)) {
    findings.push({ level: 'info', message: `agent unchecked hint OK` })
  } else {
    findings.push({ level: 'warning', message: `agent unchecked hint なし` })
  }

  // 5. iter648 invariant: sprint-create-start 維持
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (/startDate === ''\s*\n?\s*\?\s*'Sprint 開始日 \(必須、終了日以前\)'/.test(sp)) {
    findings.push({ level: 'info', message: `iter648 invariant: sprint-create-start 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter648 invariant: 破壊` })
  }

  // 6. iter645 invariant: editDod 維持
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

  console.log(`\n=== Findings (assignee-options-aria-iter649) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
