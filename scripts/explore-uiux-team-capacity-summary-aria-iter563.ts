/**
 * Phase 6.15 loop iter 563 (mode-D Desktop a11y) —
 * TeamCapacityPanel <summary> に aria-label + data-testid を補完。
 *
 * 課題: team-capacity-panel.tsx 行 62-68 の <summary> は visible text のみで
 *   aria-label / data-testid 不在。iter536 (sprint-swimlane) / iter537
 *   (workflow-output) の summary aria-label 統一 pattern と乖離。
 *
 * fix (1 ファイル ~2 行差分):
 *   - aria-label="チームメンバー 余裕時間 (今日 / 今週) を開閉"
 *   - data-testid="team-capacity-summary-toggle"
 *
 * iter536-537 と同 pattern を team-capacity-panel に展開、3 disclosure summary 統一達成。
 * +2 行差分、機能不変、視覚 layout 不変、shadcn 編集なし、id / className /
 * Users icon aria-hidden invariant 維持。
 *
 * 検証: source-side regex assert + iter515-562 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tcp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-capacity-panel.tsx'),
    'utf8',
  )

  // 1. summary aria-label + data-testid
  if (
    /aria-label="チームメンバー 余裕時間 \(今日 \/ 今週\) を開閉"/.test(tcp) &&
    /data-testid="team-capacity-summary-toggle"/.test(tcp)
  ) {
    findings.push({
      level: 'info',
      message: `team-capacity-panel.tsx: summary aria-label + data-testid 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `team-capacity-panel.tsx: summary aria-label / data-testid 不在`,
    })
  }

  // 2. 既存 id="team-capacity-summary" / Users icon 維持
  if (
    /id="team-capacity-summary"/.test(tcp) &&
    /<Users className="h-4 w-4" aria-hidden="true" \/>/.test(tcp)
  ) {
    findings.push({
      level: 'info',
      message: `team-capacity-panel.tsx: id / Users icon 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `team-capacity-panel.tsx: 既存属性破壊`,
    })
  }

  // 3. iter536 invariant: sprint-swimlane summary aria 維持
  const ssd = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprint-swimlane-disclosure.tsx'),
    'utf8',
  )
  if (/aria-label=\{`Sprint「\$\{sprintName\}」の担当者 swim-lane Gantt を開閉`\}/.test(ssd)) {
    findings.push({
      level: 'info',
      message: `iter536 invariant: sprint-swimlane summary aria 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter536 invariant: 破壊`,
    })
  }

  // 4. iter515 anchor invariant
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (/aria-label=\{\s*importsOpen\s*\?\s*`Source「\$\{src\.name\}」の Pull 履歴/.test(ip)) {
    findings.push({
      level: 'info',
      message: `iter515 invariant: integrations-panel 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter515 invariant: 破壊`,
    })
  }

  console.log(`\n=== Findings (team-capacity-summary-aria-iter563) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
