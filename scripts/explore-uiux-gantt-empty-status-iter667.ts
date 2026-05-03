/**
 * Phase 6.15 loop iter 667 (mode-D Desktop a11y) —
 * gantt-view empty 状態 `<p>` に role="status" + aria-live="polite"
 * (SR で「期間が設定された item なし」が active 通知される)。
 *
 * 課題: gantt-view.tsx 行 163-166 の empty state `<p>` は visible text のみで
 *   role / aria-live が無い。iter161 / iter177 / iter666 で確立した
 *   「empty state = role="status" + aria-live="polite"」 pattern が当 component だけ漏れ。
 *
 * fix (1 ファイル ~5 行差分):
 *   - `<p>` に `role="status"` + `aria-live="polite"`
 *
 * iter666 と同 pattern を gantt-view 同じ問題箇所に展開。
 *
 * 検証: source-side regex assert + iter515-666 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')

  // 1. empty state に role="status" + aria-live
  if (
    /<p\s*\n\s*className="text-muted-foreground text-center text-sm"\s*\n\s*role="status"\s*\n\s*aria-live="polite"\s*\n\s*>\s*\n\s*startDate \/ dueDate が両方設定された item がありません/.test(
      gv,
    )
  ) {
    findings.push({ level: 'info', message: `gantt-empty role=status + aria-live OK` })
  } else {
    findings.push({ level: 'warning', message: `gantt-empty role=status + aria-live なし` })
  }

  // 2. iter666 invariant: swimlane-empty 維持
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

  // 3. iter665 invariant: tab-comments aria-label 維持
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (/aria-label="コメントタブ — 議論履歴 \+ @メンション \+ AI Plan 投下"/.test(ied)) {
    findings.push({ level: 'info', message: `iter665 invariant: tab-comments 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter665 invariant: 破壊` })
  }

  // 4. iter662 invariant: items-board filter group 維持
  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  if (/role="group"\s*\n\s*aria-label="Item の絞り込み/.test(ib)) {
    findings.push({ level: 'info', message: `iter662 invariant: filter group 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter662 invariant: 破壊` })
  }

  // 5. iter659 invariant: async-states Loader2 motion-safe 維持
  const as = readFileSync(resolve(process.cwd(), 'src/components/shared/async-states.tsx'), 'utf8')
  if (/Loader2 className="h-5 w-5 motion-safe:animate-spin"/.test(as)) {
    findings.push({ level: 'info', message: `iter659 invariant: async-states 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter659 invariant: 破壊` })
  }

  // 6. iter658 invariant: kanban decompose 維持
  const kv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/kanban-view.tsx'),
    'utf8',
  )
  if (/group-focus-within:opacity-100/.test(kv)) {
    findings.push({ level: 'info', message: `iter658 invariant: kanban decompose 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter658 invariant: 破壊` })
  }

  console.log(`\n=== Findings (gantt-empty-status-iter667) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
