/**
 * Phase 6.15 loop iter 891 (mode-M Mobile a11y) —
 * 3 misc selects (gantt-zoom / mock-timesheet category / sprint-defaults dow) に
 * min-h-11 追加 (mobile tap target 44x44 適合)。
 *
 * 経緯: iter888-890 続編。残 select 群を順次 min-h-11 化。
 *
 * 修正: 3 select に min-h-11 を追加
 *   - gantt-view: gantt-zoom-select ("rounded border bg-transparent px-1 py-0.5 text-xs"
 *     → "min-h-11 ...")
 *   - mock-timesheet/mock-submit-form: tsCategory ("w-full rounded border px-3 py-2 text-sm"
 *     → "min-h-11 ...")
 *   - sprints-panel: sprint-defaults-dow ("h-9 rounded-md border px-2 text-sm"
 *     → "min-h-11 ...")
 *
 * 検証: source-side regex assert + iter735/843/849-890 invariant cross-check。
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
  const msf = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-submit-form.tsx'),
    'utf8',
  )
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )

  // 1. gantt-zoom-select min-h-11
  if (
    /<select[\s\S]+?className="min-h-11 rounded border bg-transparent px-1 py-0\.5 text-xs"[\s\S]+?data-testid="gantt-zoom-select"/.test(
      gv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `gantt-view gantt-zoom-select min-h-11 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `gantt-view gantt-zoom-select min-h-11 未統合`,
    })
  }

  // 2. mock-timesheet tsCategory min-h-11
  if (
    /<select[\s\S]+?id="tsCategory"[\s\S]+?className="min-h-11 w-full rounded border px-3 py-2 text-sm"/.test(
      msf,
    )
  ) {
    findings.push({
      level: 'info',
      message: `mock-timesheet tsCategory min-h-11 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `mock-timesheet tsCategory min-h-11 未統合`,
    })
  }

  // 3. sprints-panel sprint-defaults-dow min-h-11
  if (
    /<select[\s\S]+?id="sprint-defaults-dow"[\s\S]+?className="min-h-11 rounded-md border px-2 text-sm"/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `sprints-panel sprint-defaults-dow min-h-11 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprints-panel sprint-defaults-dow min-h-11 未統合`,
    })
  }

  // iter890 invariant: 3 form selects min-h-11 維持
  const tp = readFileSync(
    resolve(process.cwd(), 'src/components/template/templates-panel.tsx'),
    'utf8',
  )
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  const cte = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/create-time-entry-form.tsx'),
    'utf8',
  )
  if (
    /min-h-11 w-full rounded-md border px-3 py-1 text-sm/.test(tp) &&
    /min-h-11 rounded border px-2 py-1 text-xs/.test(gp) &&
    /min-h-11 rounded border px-2 text-sm/.test(cte)
  ) {
    findings.push({
      level: 'info',
      message: `iter890 invariant: templates/goals/time-entry selects min-h-11 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter890 invariant: 破壊` })
  }

  // shadcn UI 編集なし
  const inputUi = readFileSync(resolve(process.cwd(), 'src/components/ui/input.tsx'), 'utf8')
  if (/h-8/.test(inputUi)) {
    findings.push({
      level: 'info',
      message: `shadcn Input default h-8 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `shadcn Input 編集された` })
  }

  // iter735 invariant
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter735 invariant: team-context-editor aria-keyshortcuts 維持 OK (${tceMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant: 破壊` })
  }

  console.log(`\n=== Findings (mobile-3-misc-selects-h11-iter891) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
