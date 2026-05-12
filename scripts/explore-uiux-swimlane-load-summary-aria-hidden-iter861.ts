/**
 * Phase 6.15 loop iter 861 (mode-D Desktop a11y) —
 * sprint-swimlane-disclosure.tsx lane load summary span 内 visible
 * {row.loadSummaryJa} を aria-hidden span で wrap (iter800-860 sweep の続編)。
 *
 * 課題: sprint-swimlane-disclosure.tsx 行 172-179 の lane load summary span は
 *   aria-label="lane: {loadSummaryJa} / {conflictsJa}" を持ち (conflictsJa は
 *   競合 pair 件数を追加する richer info)、内側 visible {row.loadSummaryJa} は
 *   aria-hidden 無し → SR で aria-label と visible 両方読み上げられる可能性。
 *   Sprint planning workflow で 担当者別 swimlane に row ごとに表示される頻出 chip。
 *
 * fix (1 ファイル ~1 行差分):
 *   - {row.loadSummaryJa} を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter735/858/859/860 invariant cross-check。
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
  const hasAriaLabel =
    /aria-label=\{`lane: \$\{row\.loadSummaryJa\} \/ \$\{row\.conflictsJa\}`\}/.test(ssd)
  const hasInnerHidden = /<span aria-hidden="true">\{row\.loadSummaryJa\}<\/span>/.test(ssd)
  if (hasAriaLabel && hasInnerHidden) {
    findings.push({
      level: 'info',
      message: `iter861: sprint-swimlane lane load summary aria-hidden span OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter861: 不完全 (aria-label=${hasAriaLabel} inner-hidden=${hasInnerHidden})`,
    })
  }

  // iter860 invariant: top-items-by-time-chip 合計 + 件数 aria-hidden 維持
  const ti = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/top-items-by-time-chip.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{label\}<\/span>/.test(ti) &&
    /<span aria-hidden="true">\{row\.entryCount\} 件<\/span>/.test(ti)
  ) {
    findings.push({
      level: 'info',
      message: `iter860 invariant: top-items-by-time-chip aria-hidden span 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter860 invariant: 破壊` })
  }

  // iter859 invariant: taskchute-ticker-summary aria-hidden span 維持
  const tv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/taskchute-view.tsx'),
    'utf8',
  )
  if (/<span className="font-medium tabular-nums" aria-hidden="true">\s+合計 /.test(tv)) {
    findings.push({
      level: 'info',
      message: `iter859 invariant: taskchute-ticker-summary aria-hidden span 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter859 invariant: 破壊` })
  }

  // iter858 invariant: subtasks-progress-summary aria-hidden 維持
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/subtasks-panel.tsx'),
    'utf8',
  )
  if (/<div className="text-xs font-medium" aria-hidden="true">/.test(sp)) {
    findings.push({
      level: 'info',
      message: `iter858 invariant: subtasks-progress-summary aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter858 invariant: 破壊` })
  }

  // iter735 invariant: shadcn UI 未編集
  const tabs = readFileSync(resolve(process.cwd(), 'src/components/ui/tabs.tsx'), 'utf8')
  if (!/aria-hidden/.test(tabs)) {
    findings.push({ level: 'info', message: `iter735 invariant: shadcn/tabs.tsx 未編集 OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `iter735 invariant: shadcn tabs.tsx に aria-hidden 編集が混入`,
    })
  }

  console.log(`\n=== Findings (iter861) ===`)
  if (findings.length === 0) console.log('(なし)')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
