/**
 * Phase 6.15 loop iter 536 (mode-D Desktop a11y) —
 * SprintSwimlaneDisclosure summary に aria-label + data-testid を補完。
 *
 * 課題: sprint-swimlane-disclosure.tsx 行 58-61 の <summary> は visible text
 *   "担当者ビュー (swim-lane Gantt)" のみ、aria-label / data-testid 不在。
 *   Sprint Card は workspace に複数並ぶため、summary 文言が全て同一で SR が
 *   どの Sprint の swim-lane を開閉する trigger か区別できない。
 *
 * fix (1 ファイル ~3 行差分):
 *   - aria-label={`Sprint「${sprintName}」の担当者 swim-lane Gantt を開閉`}
 *   - data-testid={`sprint-swimlane-summary-${sprintId}`}
 *
 * 機能不変、視覚 layout 不変、shadcn 編集なし、<details> wrapper / className /
 * onToggle / Users icon aria-hidden invariant 維持。
 *
 * 検証: source-side regex assert + iter515-535 invariant cross-check。
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

  // 1. summary aria-label
  if (/aria-label=\{`Sprint「\$\{sprintName\}」の担当者 swim-lane Gantt を開閉`\}/.test(ssd)) {
    findings.push({
      level: 'info',
      message: `sprint-swimlane-disclosure.tsx: summary aria-label 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-swimlane-disclosure.tsx: summary aria-label 不在`,
    })
  }

  // 2. summary data-testid
  if (/data-testid=\{`sprint-swimlane-summary-\$\{sprintId\}`\}/.test(ssd)) {
    findings.push({
      level: 'info',
      message: `sprint-swimlane-disclosure.tsx: summary data-testid 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-swimlane-disclosure.tsx: summary data-testid 不在`,
    })
  }

  // 3. 既存 <details> wrapper / onToggle / Users icon 維持
  if (
    /<details/.test(ssd) &&
    /onToggle=\{\(e\)/.test(ssd) &&
    /<Users className="h-3\.5 w-3\.5" aria-hidden="true" \/>/.test(ssd) &&
    /data-testid=\{`sprint-swimlane-\$\{sprintId\}`\}/.test(ssd)
  ) {
    findings.push({
      level: 'info',
      message: `sprint-swimlane-disclosure.tsx: details / onToggle / Users icon / outer data-testid 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-swimlane-disclosure.tsx: 既存 invariant 破壊`,
    })
  }

  // 4. iter515-535 anchor invariant
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )
  const ok515 = /aria-label=\{\s*importsOpen\s*\?\s*`Source「\$\{src\.name\}」の Pull 履歴/.test(ip)
  const ok535 = /aria-label=\{`「\$\{row\.original\.title\}」を編集`\}/.test(bv)
  if (ok515 && ok535) {
    findings.push({
      level: 'info',
      message: `iter515 + iter535 anchor invariant 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter515 / iter535 invariant: 破壊 (515=${ok515} 535=${ok535})`,
    })
  }

  console.log(`\n=== Findings (sprint-swimlane-summary-aria-iter536) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
