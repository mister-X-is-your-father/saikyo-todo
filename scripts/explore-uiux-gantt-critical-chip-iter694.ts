/**
 * Phase 6.15 loop iter 694 (mode-D Desktop a11y) —
 * gantt-view summary banner の「critical path N 件」 chip に data-testid + title を追加
 * (gantt-summary-baseline / gantt-summary-slip と一貫性、テスト anchor + tooltip 充実)。
 *
 * 課題: gantt-view.tsx 行 312-316 の critical path chip は data-testid / title 無し。
 *   隣接の gantt-summary-baseline (行 317-321) と gantt-summary-slip (行 322-329) には
 *   data-testid あり、slip には title attribute も。SR / 視覚 / test の 3 経路で
 *   一貫性が無く、critical path だけ仕様の補足情報がない (= mouse hover で説明文不可)。
 *
 * fix (1 ファイル ~5 行差分):
 *   - data-testid="gantt-summary-critical"
 *   - title="critical path 上の item (= project 全体期間に直接影響、遅延すると全体遅延)"
 *
 * 検証: source-side regex assert + iter515-693 invariant cross-check。
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

  // 1. critical chip data-testid
  if (/data-testid="gantt-summary-critical"/.test(gv)) {
    findings.push({ level: 'info', message: `gantt-summary-critical data-testid OK` })
  } else {
    findings.push({ level: 'warning', message: `gantt-summary-critical data-testid なし` })
  }

  // 2. critical chip title attribute
  if (
    /title="critical path 上の item \(= project 全体期間に直接影響、遅延すると全体遅延\)"/.test(gv)
  ) {
    findings.push({ level: 'info', message: `critical chip title OK` })
  } else {
    findings.push({ level: 'warning', message: `critical chip title なし` })
  }

  // 3. baseline / slip 既存維持 (= 一貫した data-testid pattern)
  if (
    /data-testid="gantt-summary-baseline"/.test(gv) &&
    /data-testid="gantt-summary-slip"/.test(gv)
  ) {
    findings.push({ level: 'info', message: `baseline / slip data-testid 既存維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `baseline / slip data-testid 破壊` })
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

  // 5. iter677 invariant: gantt-jump-today focus-visible 維持 (= gantt-view 同 file)
  if (
    /text-foreground hover:bg-muted focus-visible:ring-ring relative rounded border px-2 py-0\.5 text-xs before:absolute before:-inset-3 before:content-\[''\] focus-visible:ring-2 focus-visible:outline-none/.test(
      gv,
    )
  ) {
    findings.push({ level: 'info', message: `iter677 invariant: gantt-jump-today 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter677 invariant: 破壊` })
  }

  // 6. iter667 invariant: gantt-empty 維持
  if (/role="status"\s+aria-live="polite">\s*\n\s*startDate \/ dueDate が両方設定された/.test(gv)) {
    findings.push({ level: 'info', message: `iter667 invariant: gantt-empty 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter667 invariant: 破壊` })
  }

  console.log(`\n=== Findings (gantt-critical-chip-iter694) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
