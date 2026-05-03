/**
 * Phase 6.15 loop iter 670 (mode-D Desktop a11y) —
 * top-items-by-time-chip empty state `<p>` に role="status" + aria-live="polite"
 * (Time Entries page 直近 N 日 累計時間 上位 item chip の empty 通知)。
 *
 * 課題: top-items-by-time-chip.tsx 行 154-157 の empty state `<p>` (Item 紐付け稼働記録なし)
 *   は visible text のみで role / aria-live 無し。iter666-669 sweep の続き。
 *
 * fix (1 ファイル ~5 行差分):
 *   - `<p>` に `role="status"` + `aria-live="polite"`
 *
 * 検証: source-side regex assert + iter515-669 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tic = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/top-items-by-time-chip.tsx'),
    'utf8',
  )

  // 1. top-items-empty に role="status" + aria-live
  if (
    /role="status"\s*\n\s*aria-live="polite"\s*\n\s*data-testid="top-items-by-time-empty"/.test(tic)
  ) {
    findings.push({ level: 'info', message: `top-items-empty role=status + aria-live OK` })
  } else {
    findings.push({ level: 'warning', message: `top-items-empty role=status + aria-live なし` })
  }

  // 2. iter669 invariant: team-capacity-empty 維持
  const tcp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-capacity-panel.tsx'),
    'utf8',
  )
  if (
    /role="status"\s*\n\s*aria-live="polite"\s*\n\s*data-testid="team-capacity-empty"/.test(tcp)
  ) {
    findings.push({ level: 'info', message: `iter669 invariant: team-capacity-empty 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter669 invariant: 破壊` })
  }

  // 3. iter668 invariant: deps-empty 維持
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

  // 4. iter667 invariant: gantt-empty 維持
  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')
  if (/role="status"\s+aria-live="polite">\s*\n\s*startDate \/ dueDate が両方設定された/.test(gv)) {
    findings.push({ level: 'info', message: `iter667 invariant: gantt-empty 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter667 invariant: 破壊` })
  }

  // 5. iter666 invariant: swimlane-empty 維持
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

  // 6. iter662 invariant: items-board filter group 維持
  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  if (/role="group"\s*\n\s*aria-label="Item の絞り込み/.test(ib)) {
    findings.push({ level: 'info', message: `iter662 invariant: filter group 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter662 invariant: 破壊` })
  }

  console.log(`\n=== Findings (top-items-empty-status-iter670) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
