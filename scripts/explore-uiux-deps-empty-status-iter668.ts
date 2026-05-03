/**
 * Phase 6.15 loop iter 668 (mode-D Desktop a11y) —
 * item-dependencies-panel DepSection empty state `<p>` に
 * role="status" + aria-live="polite" を付与
 * (依存先 / 依存元 が空の時の通知を SR active 化)。
 *
 * 課題: item-dependencies-panel.tsx 行 312-313 の DepSection 内 empty state `<p>`
 *   は visible text (emptyText) のみで role / aria-live が無い。
 *   iter161 / iter177 / iter666 / iter667 で確立した「empty state = role="status"
 *   + aria-live="polite"」 pattern が当 component の DepSection だけ漏れていた。
 *
 * fix (1 ファイル ~3 行差分):
 *   - `<p>` に `role="status"` + `aria-live="polite"`
 *   - prettier 整形で多行化
 *
 * iter666 / iter667 と同 pattern を item-dependencies-panel に展開。
 *
 * 検証: source-side regex assert + iter515-667 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const idp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-dependencies-panel.tsx'),
    'utf8',
  )

  // 1. DepSection empty state に role="status" + aria-live
  if (
    /<p className="text-muted-foreground text-xs" role="status" aria-live="polite">\s*\n\s*\{emptyText\}/.test(
      idp,
    )
  ) {
    findings.push({ level: 'info', message: `DepSection empty role=status + aria-live OK` })
  } else {
    findings.push({ level: 'warning', message: `DepSection empty role=status + aria-live なし` })
  }

  // 2. iter667 invariant: gantt-empty 維持
  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')
  if (/role="status"\s+aria-live="polite">\s*\n\s*startDate \/ dueDate が両方設定された/.test(gv)) {
    findings.push({ level: 'info', message: `iter667 invariant: gantt-empty 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter667 invariant: 破壊` })
  }

  // 3. iter666 invariant: swimlane-empty 維持
  const ssd = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprint-swimlane-disclosure.tsx'),
    'utf8',
  )
  if (
    /role="status"\s*\n\s*aria-live="polite"\s*\n\s*data-testid="sprint-swimlane-empty"/.test(ssd)
  ) {
    findings.push({ level: 'info', message: `iter666 invariant: swimlane-empty 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter666 invariant: 破壊` })
  }

  // 4. iter665 invariant: tab-comments aria-label 維持
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (/aria-label="コメントタブ — 議論履歴 \+ @メンション \+ AI Plan 投下"/.test(ied)) {
    findings.push({ level: 'info', message: `iter665 invariant: tab-comments 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter665 invariant: 破壊` })
  }

  // 5. iter662 invariant: items-board filter group 維持
  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  if (/role="group"\s*\n\s*aria-label="Item の絞り込み/.test(ib)) {
    findings.push({ level: 'info', message: `iter662 invariant: filter group 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter662 invariant: 破壊` })
  }

  // 6. iter659 invariant: async-states 維持
  const as = readFileSync(resolve(process.cwd(), 'src/components/shared/async-states.tsx'), 'utf8')
  if (/Loader2 className="h-5 w-5 motion-safe:animate-spin"/.test(as)) {
    findings.push({ level: 'info', message: `iter659 invariant: async-states 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter659 invariant: 破壊` })
  }

  console.log(`\n=== Findings (deps-empty-status-iter668) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
