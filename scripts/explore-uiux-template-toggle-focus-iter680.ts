/**
 * Phase 6.15 loop iter 680 (mode-D Desktop a11y) —
 * templates-panel template card disclosure toggle button に focus-visible ring 追加
 * (Templates page card title click で expand/collapse、iter671-679 sweep 継続)。
 *
 * 課題: templates-panel.tsx 行 260 の template card 内 toggle button は
 *   `flex-1 text-left` のみで focus-visible ring 無し。
 *   keyboard ユーザは Tab で focus してもどの template の disclosure に居るか不可視。
 *
 * fix (1 ファイル ~1 行差分):
 *   - className に `focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none` + `rounded`
 *
 * 検証: source-side regex assert + iter515-679 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tp = readFileSync(
    resolve(process.cwd(), 'src/components/template/templates-panel.tsx'),
    'utf8',
  )

  // 1. template toggle に focus-visible
  if (
    /focus-visible:ring-ring flex-1 rounded text-left focus-visible:ring-2 focus-visible:outline-none/.test(
      tp,
    )
  ) {
    findings.push({ level: 'info', message: `template toggle focus-visible OK` })
  } else {
    findings.push({ level: 'warning', message: `template toggle focus-visible なし` })
  }

  // 2. iter679 invariant: workspace-link 維持
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

  // 3. iter678 invariant: archive-title-link 維持
  const aip = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/archived-items-panel.tsx'),
    'utf8',
  )
  if (
    /text-primary focus-visible:ring-ring rounded hover:underline focus-visible:ring-2 focus-visible:outline-none/.test(
      aip,
    )
  ) {
    findings.push({ level: 'info', message: `iter678 invariant: archive-title-link 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter678 invariant: 破壊` })
  }

  // 4. iter673 invariant: goal-toggle 維持
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (
    /hover:bg-muted focus-visible:ring-ring mt-0\.5 rounded p-1 focus-visible:ring-2 focus-visible:outline-none/.test(
      gp,
    )
  ) {
    findings.push({ level: 'info', message: `iter673 invariant: goal-toggle 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter673 invariant: 破壊` })
  }

  // 5. iter671 invariant: severity-chip 維持
  const sc = readFileSync(resolve(process.cwd(), 'src/components/shared/severity-chip.tsx'), 'utf8')
  if (/'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none'/.test(sc)) {
    findings.push({ level: 'info', message: `iter671 invariant: severity-chip 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter671 invariant: 破壊` })
  }

  console.log(`\n=== Findings (template-toggle-focus-iter680) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
