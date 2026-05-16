/**
 * Phase 6.15 loop iter 889 (mode-M Mobile a11y) —
 * item-edit-dialog (2 select: editSprint / editKr) + item-dependencies-panel
 * (2 select: dep-kind / dep-target) に min-h-11 追加 (mobile tap target 44x44 適合)。
 *
 * 経緯: iter888 続編 (filter selects min-h-11)。同 pattern を Item 編集 dialog +
 *   依存追加 form の 4 select に展開、mobile tap mistake 削減。
 *
 * 修正: 4 select に min-h-11 を追加 (className 先頭付近に挿入)
 *   - item-edit-dialog: editSprint + editKr (両方 "w-full rounded border px-2 py-1.5 text-sm" → "min-h-11 w-full ...")
 *   - item-dependencies-panel: dep-kind + dep-target
 *
 * 検証: source-side regex assert + iter735/843/849-888 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  const idp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-dependencies-panel.tsx'),
    'utf8',
  )

  // 1. item-edit-dialog editSprint + editKr selects に min-h-11 (2 箇所)
  const iedSelectsCount = (ied.match(/min-h-11 w-full rounded border px-2 py-1\.5 text-sm/g) ?? [])
    .length
  if (iedSelectsCount >= 2) {
    findings.push({
      level: 'info',
      message: `item-edit-dialog 2 select min-h-11 OK (${iedSelectsCount} 箇所)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `item-edit-dialog 2 select min-h-11 不足 (現在 ${iedSelectsCount}、期待 2)`,
    })
  }

  // 2. item-dependencies-panel dep-kind select min-h-11
  if (
    /<select[\s\S]+?className="min-h-11 rounded border px-2 py-1\.5 text-sm"[\s\S]+?data-testid="dep-kind"/.test(
      idp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `item-dependencies-panel dep-kind min-h-11 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `item-dependencies-panel dep-kind min-h-11 未統合`,
    })
  }

  // 3. item-dependencies-panel dep-target select min-h-11
  if (
    /<select[\s\S]+?className="min-h-11 min-w-\[260px\] flex-1 rounded border px-2 py-1\.5 text-sm"[\s\S]+?data-testid="dep-target"/.test(
      idp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `item-dependencies-panel dep-target min-h-11 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `item-dependencies-panel dep-target min-h-11 未統合`,
    })
  }

  // iter888 invariant: items-board filter selects min-h-11
  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  if ((ib.match(/min-h-11 rounded border px-2 py-1 text-sm/g) ?? []).length >= 2) {
    findings.push({
      level: 'info',
      message: `iter888 invariant: items-board filter selects min-h-11 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter888 invariant: 破壊` })
  }

  // shadcn UI 編集なし
  const inputUi = readFileSync(resolve(process.cwd(), 'src/components/ui/input.tsx'), 'utf8')
  if (/h-8/.test(inputUi)) {
    findings.push({
      level: 'info',
      message: `shadcn Input default h-8 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `shadcn Input 編集された` })
  }

  // iter735 invariant
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter735 invariant: team-context-editor aria-keyshortcuts 維持 OK (${tceMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant: 破壊` })
  }

  console.log(`\n=== Findings (mobile-edit-dialog-deps-selects-h11-iter889) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
