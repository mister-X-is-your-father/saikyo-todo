/**
 * Phase 6.15 loop iter 669 (mode-D Desktop a11y) —
 * team-capacity-panel empty state `<p>` に role="status" + aria-live="polite"
 * (Workspace home の チームメンバー余裕時間 一覧 の「member 未登録」 通知)。
 *
 * 課題: team-capacity-panel.tsx 行 126-128 の empty state `<p>` は
 *   visible text のみで role / aria-live が無い。iter666-668 sweep で発見。
 *
 * fix (1 ファイル ~5 行差分):
 *   - `<p>` に `role="status"` + `aria-live="polite"`
 *
 * iter666 / iter667 / iter668 と同 pattern を team-capacity-panel に展開。
 *
 * 検証: source-side regex assert + iter515-668 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tcp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-capacity-panel.tsx'),
    'utf8',
  )

  // 1. team-capacity empty に role="status" + aria-live
  if (
    /role="status"\s*\n\s*aria-live="polite"\s*\n\s*data-testid="team-capacity-empty"/.test(tcp)
  ) {
    findings.push({ level: 'info', message: `team-capacity-empty role=status + aria-live OK` })
  } else {
    findings.push({ level: 'warning', message: `team-capacity-empty role=status + aria-live なし` })
  }

  // 2. iter668 invariant: deps-empty 維持
  const idp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-dependencies-panel.tsx'),
    'utf8',
  )
  if (
    /<p className="text-muted-foreground text-xs" role="status" aria-live="polite">\s*\n\s*\{emptyText\}/.test(
      idp,
    )
  ) {
    findings.push({ level: 'info', message: `iter668 invariant: deps-empty 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter668 invariant: 破壊` })
  }

  // 3. iter667 invariant: gantt-empty 維持
  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')
  if (/role="status"\s+aria-live="polite">\s*\n\s*startDate \/ dueDate が両方設定された/.test(gv)) {
    findings.push({ level: 'info', message: `iter667 invariant: gantt-empty 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter667 invariant: 破壊` })
  }

  // 4. iter666 invariant: swimlane-empty 維持
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

  console.log(`\n=== Findings (team-capacity-empty-status-iter669) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
