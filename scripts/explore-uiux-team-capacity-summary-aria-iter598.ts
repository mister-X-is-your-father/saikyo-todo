/**
 * Phase 6.15 loop iter 598 (mode-D Desktop a11y) —
 * team-capacity-panel summary aria-label を 2-state 動的化 (iter597 と同 pattern)。
 *
 * 課題: team-capacity-panel.tsx 行 60-66 の <summary> は aria-label が
 *   "チームメンバー 余裕時間 (今日 / 今週) を開閉" の static で 現在の状態
 *   (open/closed) と「クリックでどうなるか」 が SR に伝わらない。
 *
 * fix (1 ファイル ~6 行差分):
 *   - aria-label 2-state 動的化:
 *     - open: "チームメンバー 余裕時間 (今日 / 今週) を閉じる"
 *     - closed: "チームメンバー 余裕時間 (今日 / 今週) を開く"
 *
 * iter597 (sprint-swimlane-disclosure summary 2-state) を team-capacity-panel
 * summary に水平展開、saikyo-todo 内 <details><summary> 系 disclosure 全 2 件が
 * 動的 aria-label 統一達成。
 *
 * 検証: source-side regex assert + iter515-597 invariant cross-check。
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

  // 1. open 時 aria-label
  if (/open\s*\n?\s*\?\s*'チームメンバー 余裕時間 \(今日 \/ 今週\) を閉じる'/.test(tcp)) {
    findings.push({ level: 'info', message: `open 時 aria-label "閉じる" OK` })
  } else {
    findings.push({ level: 'warning', message: `open 時 aria-label なし` })
  }

  // 2. closed 時 aria-label
  if (/:\s*'チームメンバー 余裕時間 \(今日 \/ 今週\) を開く'/.test(tcp)) {
    findings.push({ level: 'info', message: `closed 時 aria-label "開く" OK` })
  } else {
    findings.push({ level: 'warning', message: `closed 時 aria-label なし` })
  }

  // 3. iter597 invariant: sprint-swimlane summary 2-state 維持
  const ssd = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprint-swimlane-disclosure.tsx'),
    'utf8',
  )
  if (/open\s*\n?\s*\?\s*`Sprint「\$\{sprintName\}」の担当者 swim-lane Gantt を閉じる`/.test(ssd)) {
    findings.push({ level: 'info', message: `iter597 invariant: sprint-swimlane 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter597 invariant: 破壊` })
  }

  // 4. iter596 invariant: src-method aria-label 維持
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (/aria-label=\{`HTTP メソッド \(現在: \$\{/.test(ip)) {
    findings.push({ level: 'info', message: `iter596 invariant: src-method 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter596 invariant: 破壊` })
  }

  // 5. iter594 invariant: dep-target option statusJa 維持
  const idp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-dependencies-panel.tsx'),
    'utf8',
  )
  if (/const statusJa = getStatusVisual\(c\.status\)\.shortLabel/.test(idp)) {
    findings.push({ level: 'info', message: `iter594 invariant: dep-target statusJa 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter594 invariant: 破壊` })
  }

  // 6. iter589 invariant: status filter aria-label 維持
  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  if (/statusFilter === 'todo'\s*\n?\s*\?\s*'TODO'/.test(ib)) {
    findings.push({ level: 'info', message: `iter589 invariant: status filter 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter589 invariant: 破壊` })
  }

  console.log(`\n=== Findings (team-capacity-summary-aria-iter598) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
