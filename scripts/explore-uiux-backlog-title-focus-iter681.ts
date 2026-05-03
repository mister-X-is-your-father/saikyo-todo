/**
 * Phase 6.15 loop iter 681 (mode-D Desktop a11y) —
 * backlog-view backlog-title plain button (item title click で edit dialog) に
 * focus-visible ring 追加 (iter671-680 sweep 継続)。
 *
 * 課題: backlog-view.tsx 行 105 の backlog-title button (テーブル行 title click) は
 *   `hover:text-primary text-left hover:underline` のみで focus-visible 無し。
 *   keyboard ユーザは Tab で focus してもどの backlog row title に居るか不可視。
 *   テーブル view では特に Tab 操作で行を辿るので致命的。
 *
 * fix (1 ファイル ~1 行差分):
 *   - className に `focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none` + `rounded`
 *
 * 検証: source-side regex assert + iter515-680 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )

  // 1. backlog-title に focus-visible
  if (
    /'hover:text-primary focus-visible:ring-ring rounded text-left hover:underline focus-visible:ring-2 focus-visible:outline-none /.test(
      bv,
    )
  ) {
    findings.push({ level: 'info', message: `backlog-title focus-visible OK` })
  } else {
    findings.push({ level: 'warning', message: `backlog-title focus-visible なし` })
  }

  // 2. iter663 invariant: backlog sort indicator aria-hidden 維持 (= backlog-view 同 file)
  if (/<span aria-hidden="true">\s*\n\s*\{\{ asc: ' ▲', desc: ' ▼' \}/.test(bv)) {
    findings.push({ level: 'info', message: `iter663 invariant: backlog sort 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter663 invariant: 破壊` })
  }

  // 3. iter680 invariant: template toggle 維持
  const tp = readFileSync(
    resolve(process.cwd(), 'src/components/template/templates-panel.tsx'),
    'utf8',
  )
  if (
    /focus-visible:ring-ring flex-1 rounded text-left focus-visible:ring-2 focus-visible:outline-none/.test(
      tp,
    )
  ) {
    findings.push({ level: 'info', message: `iter680 invariant: template toggle 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter680 invariant: 破壊` })
  }

  // 4. iter679 invariant: workspace-link 維持
  const ap = readFileSync(resolve(process.cwd(), 'src/app/page.tsx'), 'utf8')
  if (
    /hover:bg-muted focus-visible:ring-ring block rounded-lg border p-4 transition focus-visible:ring-2 focus-visible:outline-none/.test(
      ap,
    )
  ) {
    findings.push({ level: 'info', message: `iter679 invariant: workspace-link 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter679 invariant: 破壊` })
  }

  // 5. iter671 invariant: severity-chip 維持
  const sc = readFileSync(resolve(process.cwd(), 'src/components/shared/severity-chip.tsx'), 'utf8')
  if (/'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none'/.test(sc)) {
    findings.push({ level: 'info', message: `iter671 invariant: severity-chip 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter671 invariant: 破壊` })
  }

  console.log(`\n=== Findings (backlog-title-focus-iter681) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
