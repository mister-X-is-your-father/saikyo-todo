/**
 * Phase 6.15 loop iter 678 (mode-D Desktop a11y) —
 * archived-items-panel archive-title-link Link に focus-visible ring 追加
 * (Archive page table 内 link、iter671-677 sweep の link 版)。
 *
 * 課題: archived-items-panel.tsx 行 136 の `<Link>` (アーカイブ済 item を click で開く) は
 *   `text-primary hover:underline` で focus-visible ring 無し。Tailwind 4 reset で
 *   keyboard ユーザは Tab で focus してもどの link に居るか不可視。WCAG 2.4.7 違反方向。
 *
 * fix (1 ファイル ~1 行差分):
 *   - className に `focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none` + `rounded`
 *
 * 検証: source-side regex assert + iter515-677 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const aip = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/archived-items-panel.tsx'),
    'utf8',
  )

  // 1. archive-title-link に focus-visible
  if (
    /text-primary focus-visible:ring-ring rounded hover:underline focus-visible:ring-2 focus-visible:outline-none/.test(
      aip,
    )
  ) {
    findings.push({ level: 'info', message: `archive-title-link focus-visible OK` })
  } else {
    findings.push({ level: 'warning', message: `archive-title-link focus-visible なし` })
  }

  // 2. iter677 invariant: gantt-jump-today 維持
  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')
  if (
    /text-foreground hover:bg-muted focus-visible:ring-ring relative rounded border px-2 py-0\.5 text-xs before:absolute before:-inset-3 before:content-\[''\] focus-visible:ring-2 focus-visible:outline-none/.test(
      gv,
    )
  ) {
    findings.push({ level: 'info', message: `iter677 invariant: gantt-jump-today 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter677 invariant: 破壊` })
  }

  // 3. iter676 invariant: subtask-drag focus-visible 維持
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/subtasks-panel.tsx'),
    'utf8',
  )
  if (
    /text-muted-foreground hover:text-foreground focus-visible:ring-ring relative -ml-1 cursor-grab touch-none rounded before:absolute before:-inset-3 before:content-\[''\] focus-visible:ring-2 focus-visible:outline-none active:cursor-grabbing/.test(
      sp,
    )
  ) {
    findings.push({ level: 'info', message: `iter676 invariant: subtask-drag 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter676 invariant: 破壊` })
  }

  // 4. iter671 invariant: severity-chip 維持
  const sc = readFileSync(resolve(process.cwd(), 'src/components/shared/severity-chip.tsx'), 'utf8')
  if (/'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none'/.test(sc)) {
    findings.push({ level: 'info', message: `iter671 invariant: severity-chip 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter671 invariant: 破壊` })
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

  console.log(`\n=== Findings (archive-link-focus-iter678) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
