/**
 * Phase 6.15 loop iter 673 (mode-D Desktop a11y) —
 * goals-panel の goal-toggle / kr-delete plain button に focus-visible ring 追加
 * (WCAG 2.4.7 Focus Visible 準拠、iter671/672 sweep 継続)。
 *
 * 課題: goals-panel.tsx 行 380 (goal-toggle) と 行 683 (kr-delete) の plain `<button>` は
 *   focus-visible ring 無し。Tailwind 4 reset で browser default の focus ring が無効化、
 *   keyboard ユーザは Tab で focus してもどの button に居るか視覚的不可視。
 *
 * fix (1 ファイル ~2 行差分):
 *   - goal-toggle: className に `focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none`
 *   - kr-delete: className に同上 (`disabled:opacity-50` 等の既存 class 維持)
 *
 * 検証: source-side regex assert + iter515-672 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )

  // 1. goal-toggle に focus-visible
  if (
    /hover:bg-muted focus-visible:ring-ring mt-0\.5 rounded p-1 focus-visible:ring-2 focus-visible:outline-none/.test(
      gp,
    )
  ) {
    findings.push({ level: 'info', message: `goal-toggle focus-visible OK` })
  } else {
    findings.push({ level: 'warning', message: `goal-toggle focus-visible なし` })
  }

  // 2. kr-delete に focus-visible
  if (
    /text-muted-foreground hover:text-destructive focus-visible:ring-ring relative text-xs before:absolute before:-inset-3 before:content-\[''\] focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50 disabled:before:hidden/.test(
      gp,
    )
  ) {
    findings.push({ level: 'info', message: `kr-delete focus-visible OK` })
  } else {
    findings.push({ level: 'warning', message: `kr-delete focus-visible なし` })
  }

  // 3. iter672 invariant: goals-empty-create / sprints-empty-create 維持
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (
    /text-primary hover:bg-muted focus-visible:ring-ring mt-2 inline-flex min-h-11 items-center rounded border px-3 py-1\.5 text-xs hover:underline focus-visible:ring-2 focus-visible:outline-none/.test(
      sp,
    ) &&
    /text-primary hover:bg-muted focus-visible:ring-ring mt-2 inline-flex min-h-11 items-center rounded border px-3 py-1\.5 text-xs hover:underline focus-visible:ring-2 focus-visible:outline-none/.test(
      gp,
    )
  ) {
    findings.push({ level: 'info', message: `iter672 invariant: empty-create focus 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter672 invariant: 破壊` })
  }

  // 4. iter671 invariant: severity-chip focus-visible 維持
  const sc = readFileSync(resolve(process.cwd(), 'src/components/shared/severity-chip.tsx'), 'utf8')
  if (/'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none'/.test(sc)) {
    findings.push({ level: 'info', message: `iter671 invariant: severity-chip 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter671 invariant: 破壊` })
  }

  // 5. iter669 invariant: team-capacity-empty 維持
  const tcp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-capacity-panel.tsx'),
    'utf8',
  )
  if (
    /role="status"\s*\n\s*aria-live="polite"\s*\n\s*data-testid="team-capacity-empty"/.test(tcp)
  ) {
    findings.push({ level: 'info', message: `iter669 invariant: team-capacity 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter669 invariant: 破壊` })
  }

  console.log(`\n=== Findings (goals-buttons-focus-iter673) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
