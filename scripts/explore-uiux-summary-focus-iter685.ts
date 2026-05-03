/**
 * Phase 6.15 loop iter 685 (mode-D Desktop a11y) —
 * native `<summary>` 要素 3 箇所に focus-visible ring 追加
 * (sprint-swimlane / team-capacity / workflows-panel node-output)。
 *
 * 課題: native `<summary>` (`<details>` 子) は browser default の focus ring を
 *   持つが、Tailwind 4 の reset で `* { outline-ring/50 }` が適用された結果
 *   実際の outline は :focus-visible 時に明示しないと表示されない。
 *   3 file の summary はいずれも focus-visible:ring-* がなく keyboard ユーザは
 *   どの summary に focus が当たっているか不可視。
 *
 * fix (3 ファイル ~3 行差分):
 *   - sprint-swimlane-disclosure.tsx: summary に focus-visible:ring-* + rounded
 *   - team-capacity-panel.tsx: summary に同上
 *   - workflow/workflows-panel.tsx: node-output summary に同上
 *
 * 検証: source-side regex assert + iter515-684 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ssd = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprint-swimlane-disclosure.tsx'),
    'utf8',
  )
  const tcp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-capacity-panel.tsx'),
    'utf8',
  )
  const wf = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )

  // 1. sprint-swimlane summary に focus-visible
  if (
    /text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex cursor-pointer items-center gap-1\.5 rounded text-xs focus-visible:ring-2 focus-visible:outline-none/.test(
      ssd,
    )
  ) {
    findings.push({ level: 'info', message: `sprint-swimlane summary focus-visible OK` })
  } else {
    findings.push({ level: 'warning', message: `sprint-swimlane summary focus-visible なし` })
  }

  // 2. team-capacity summary に focus-visible
  if (
    /text-foreground focus-visible:ring-ring inline-flex cursor-pointer items-center gap-1\.5 rounded text-sm font-medium focus-visible:ring-2 focus-visible:outline-none/.test(
      tcp,
    )
  ) {
    findings.push({ level: 'info', message: `team-capacity summary focus-visible OK` })
  } else {
    findings.push({ level: 'warning', message: `team-capacity summary focus-visible なし` })
  }

  // 3. workflows-panel node-output summary に focus-visible
  if (
    /text-muted-foreground focus-visible:ring-ring cursor-pointer rounded focus-visible:ring-2 focus-visible:outline-none/.test(
      wf,
    )
  ) {
    findings.push({ level: 'info', message: `workflows node-output summary focus-visible OK` })
  } else {
    findings.push({ level: 'warning', message: `workflows node-output summary focus-visible なし` })
  }

  // 4. iter684 invariant: backlog DragHandle role=img 維持
  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">≡<\/span>/.test(bv)) {
    findings.push({ level: 'info', message: `iter684 invariant: DragHandle ≡ aria-hidden 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter684 invariant: 破壊` })
  }

  // 5. iter681 invariant: backlog-title 維持
  if (
    /'hover:text-primary focus-visible:ring-ring rounded text-left hover:underline focus-visible:ring-2 focus-visible:outline-none /.test(
      bv,
    )
  ) {
    findings.push({ level: 'info', message: `iter681 invariant: backlog-title 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter681 invariant: 破壊` })
  }

  console.log(`\n=== Findings (summary-focus-iter685) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
