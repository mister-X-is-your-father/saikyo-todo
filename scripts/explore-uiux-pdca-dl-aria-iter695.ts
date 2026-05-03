/**
 * Phase 6.15 loop iter 695 (mode-D Desktop a11y) —
 * pdca cycle-check-stats-card の `<dl>` 2 箇所に aria-label 追加
 * (Lead time 統計 / ステータス分布 のグループ identifiability)。
 *
 * 課題: cycle-check-stats-card.tsx 行 94 と 行 115 の `<dl>` (definition list) は
 *   aria-label 無し。視覚的には見出し的な context が無く、SR が dl に入った時
 *   「定義リスト 6 項目」とだけ announce されてどんなメトリックか不明。
 *
 * fix (1 ファイル ~5 行差分):
 *   - 1 つ目 dl: `aria-label="Lead time 統計 (平均 / 中央 / 期間)"`
 *   - 2 つ目 dl: `aria-label="ステータス分布 (完了 / 未完了 / blocked)"`
 *
 * 検証: source-side regex assert + iter515-694 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const cs = readFileSync(
    resolve(process.cwd(), 'src/components/pdca/cycle-check-stats-card.tsx'),
    'utf8',
  )

  // 1. Lead time dl aria-label
  if (
    /<dl className="grid grid-cols-3 gap-2 text-xs" aria-label="Lead time 統計 \(平均 \/ 中央 \/ 期間\)">/.test(
      cs,
    )
  ) {
    findings.push({ level: 'info', message: `Lead time dl aria-label OK` })
  } else {
    findings.push({ level: 'warning', message: `Lead time dl aria-label なし` })
  }

  // 2. ステータス分布 dl aria-label
  if (/aria-label="ステータス分布 \(完了 \/ 未完了 \/ blocked\)"/.test(cs)) {
    findings.push({ level: 'info', message: `ステータス分布 dl aria-label OK` })
  } else {
    findings.push({ level: 'warning', message: `ステータス分布 dl aria-label なし` })
  }

  // 3. iter694 invariant: gantt critical chip data-testid 維持
  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')
  if (/data-testid="gantt-summary-critical"/.test(gv)) {
    findings.push({ level: 'info', message: `iter694 invariant: gantt-summary-critical 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter694 invariant: 破壊` })
  }

  // 4. iter693 invariant: ショートカット optgroup 維持
  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  if (
    /<optgroup label="ショートカット">\s*\n\s*<option value="active">稼働中の Sprint<\/option>/.test(
      ib,
    )
  ) {
    findings.push({ level: 'info', message: `iter693 invariant: ショートカット optgroup 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter693 invariant: 破壊` })
  }

  // 5. iter690 invariant: kanban empty 維持
  const kv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/kanban-view.tsx'),
    'utf8',
  )
  if (
    /<div\s*\n\s*className="text-muted-foreground rounded border border-dashed px-2 py-4 text-center text-xs"\s*\n\s*role="status"\s*\n\s*aria-live="polite"/.test(
      kv,
    )
  ) {
    findings.push({ level: 'info', message: `iter690 invariant: kanban empty 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter690 invariant: 破壊` })
  }

  console.log(`\n=== Findings (pdca-dl-aria-iter695) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
