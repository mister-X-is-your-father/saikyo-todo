/**
 * Phase 6.15 loop iter 672 (mode-D Desktop a11y) —
 * goals-empty-create / sprints-empty-create button に focus-visible ring 追加
 * (WCAG 2.4.7 Focus Visible 準拠、empty-state CTA pattern 統一)。
 *
 * 課題: goals-panel.tsx 行 289 と sprints-panel.tsx 行 346 の empty-create button は
 *   `min-h-11` で touch target は OK だが focus-visible ring 無し。
 *   integrations-empty-create / today-empty-quick-add / inbox-empty-quick-add は既に
 *   focus-visible:ring-* 持つので統一すべき (iter671 と同 a11y 軸)。
 *
 * fix (2 ファイル ~2 行差分、各 file +1 className 修正):
 *   - goals-panel: className に `focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none` 追加
 *   - sprints-panel: 同上
 *
 * iter671 と同 a11y 軸 (focus visibility) を empty-state CTA に展開。
 *
 * 検証: source-side regex assert + iter515-671 invariant cross-check。
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
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )

  // 1. goals-empty-create に focus-visible:ring
  if (
    /text-primary hover:bg-muted focus-visible:ring-ring mt-2 inline-flex min-h-11 items-center rounded border px-3 py-1\.5 text-xs hover:underline focus-visible:ring-2 focus-visible:outline-none/.test(
      gp,
    )
  ) {
    findings.push({ level: 'info', message: `goals-empty-create focus-visible OK` })
  } else {
    findings.push({ level: 'warning', message: `goals-empty-create focus-visible なし` })
  }

  // 2. sprints-empty-create に focus-visible:ring
  if (
    /text-primary hover:bg-muted focus-visible:ring-ring mt-2 inline-flex min-h-11 items-center rounded border px-3 py-1\.5 text-xs hover:underline focus-visible:ring-2 focus-visible:outline-none/.test(
      sp,
    )
  ) {
    findings.push({ level: 'info', message: `sprints-empty-create focus-visible OK` })
  } else {
    findings.push({ level: 'warning', message: `sprints-empty-create focus-visible なし` })
  }

  // 3. iter671 invariant: severity-chip focus-visible 維持
  const sc = readFileSync(resolve(process.cwd(), 'src/components/shared/severity-chip.tsx'), 'utf8')
  if (/'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none'/.test(sc)) {
    findings.push({ level: 'info', message: `iter671 invariant: severity-chip focus 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter671 invariant: 破壊` })
  }

  // 4. iter658 invariant: kanban decompose group-focus-within 維持
  const kv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/kanban-view.tsx'),
    'utf8',
  )
  if (/group-focus-within:opacity-100/.test(kv)) {
    findings.push({ level: 'info', message: `iter658 invariant: kanban decompose 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter658 invariant: 破壊` })
  }

  // 5. iter669 invariant: team-capacity-empty 維持
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

  console.log(`\n=== Findings (empty-create-focus-iter672) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
