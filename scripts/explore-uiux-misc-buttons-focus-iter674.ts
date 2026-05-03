/**
 * Phase 6.15 loop iter 674 (mode-D Desktop a11y) —
 * operation-board done-yesterday-toggle と today-title plain button に
 * focus-visible ring 追加 (iter671-673 sweep 継続)。
 *
 * 課題:
 *   - operation-board-widget.tsx 行 265 の done-yesterday-toggle (昨日 done 件数を開閉) は
 *     focus-visible 無し
 *   - today-view.tsx 行 214 の today-title (item title click で edit dialog 開く) は
 *     focus-visible 無し
 *
 * fix (2 ファイル ~2 行差分):
 *   - operation-board: className に `focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none`
 *     と `rounded` を追加 (ring を rounded で表示)
 *   - today-view: className に同上 + `rounded`
 *
 * 検証: source-side regex assert + iter515-673 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ob = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )
  const tv = readFileSync(resolve(process.cwd(), 'src/components/workspace/today-view.tsx'), 'utf8')

  // 1. done-yesterday-toggle に focus-visible
  if (
    /hover:text-foreground text-muted-foreground focus-visible:ring-ring relative flex items-center gap-1 rounded text-xs before:absolute before:-inset-3 before:content-\[''\] focus-visible:ring-2 focus-visible:outline-none/.test(
      ob,
    )
  ) {
    findings.push({ level: 'info', message: `done-yesterday-toggle focus-visible OK` })
  } else {
    findings.push({ level: 'warning', message: `done-yesterday-toggle focus-visible なし` })
  }

  // 2. today-title に focus-visible
  if (
    /hover:text-primary focus-visible:ring-ring truncate rounded text-left font-medium hover:underline focus-visible:ring-2 focus-visible:outline-none/.test(
      tv,
    )
  ) {
    findings.push({ level: 'info', message: `today-title focus-visible OK` })
  } else {
    findings.push({ level: 'warning', message: `today-title focus-visible なし` })
  }

  // 3. iter673 invariant: goal-toggle / kr-delete focus-visible 維持
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

  // 4. iter671 invariant: severity-chip focus-visible 維持
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

  console.log(`\n=== Findings (misc-buttons-focus-iter674) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
