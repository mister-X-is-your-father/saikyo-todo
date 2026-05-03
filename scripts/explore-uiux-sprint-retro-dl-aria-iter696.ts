/**
 * Phase 6.15 loop iter 696 (mode-D Desktop a11y) —
 * sprint-retro-widget の planned vs delivered `<dl>` に aria-label 追加
 * (iter695 の definition list 命名 sweep の続き)。
 *
 * 課題: sprint-retro-widget.tsx 行 116 の `<dl>` (planned/delivered/delta 内訳) は
 *   aria-label 無し。SR が「定義リスト 3 項目」とだけ announce。
 *
 * fix (1 ファイル ~3 行差分):
 *   - dl に `aria-label="計画 vs 納品 (計画 / 納品 / 差分)"`
 *
 * iter695 (pdca cycle-check 2 dl) と同 pattern を sprint-retro に展開。
 *
 * 検証: source-side regex assert + iter515-695 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const srw = readFileSync(
    resolve(process.cwd(), 'src/components/sprint/sprint-retro-widget.tsx'),
    'utf8',
  )

  // 1. planned vs delivered dl aria-label
  if (/aria-label="計画 vs 納品 \(計画 \/ 納品 \/ 差分\)"/.test(srw)) {
    findings.push({ level: 'info', message: `sprint-retro dl aria-label OK` })
  } else {
    findings.push({ level: 'warning', message: `sprint-retro dl aria-label なし` })
  }

  // 2. iter695 invariant: pdca dl 維持
  const cs = readFileSync(
    resolve(process.cwd(), 'src/components/pdca/cycle-check-stats-card.tsx'),
    'utf8',
  )
  if (/aria-label="Lead time 統計 \(平均 \/ 中央 \/ 期間\)"/.test(cs)) {
    findings.push({ level: 'info', message: `iter695 invariant: pdca lead time dl 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter695 invariant: 破壊` })
  }

  // 3. iter694 invariant: gantt critical chip 維持
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

  console.log(`\n=== Findings (sprint-retro-dl-aria-iter696) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
