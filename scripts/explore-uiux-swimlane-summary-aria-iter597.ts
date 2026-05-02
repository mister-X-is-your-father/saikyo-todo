/**
 * Phase 6.15 loop iter 597 (mode-D Desktop a11y) —
 * sprint-swimlane-disclosure summary aria-label を 2-state 動的化
 * (open/close dispatch、operation-board-widget pattern と整合)。
 *
 * 課題: sprint-swimlane-disclosure.tsx 行 58-65 の <summary> は aria-label が
 *   `Sprint「${sprintName}」の担当者 swim-lane Gantt を開閉` の static で
 *   現在の状態 (open/closed) と「クリックでどうなるか」 が SR に伝わらない。
 *   <details> の native aria-expanded はブラウザが付けるが、aria-label が
 *   "開閉" のままだと SR は「開閉する? 既に開いてる?」 が分からない。
 *
 * fix (1 ファイル ~6 行差分):
 *   - aria-label 動的化:
 *     - open: `Sprint「${sprintName}」の担当者 swim-lane Gantt を閉じる`
 *     - closed: `Sprint「${sprintName}」の担当者 swim-lane Gantt を開く`
 *
 * iter587/588/589/590/591/592/593/594/595/596 (動的 aria-label expose) pattern
 * を <summary> disclosure に水平展開。operation-board-widget の done-yesterday-toggle
 * と同 pattern (動的 aria-label + aria-expanded、ただし summary は native expanded)。
 *
 * 検証: source-side regex assert + iter515-596 invariant cross-check。
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

  // 1. open 時 aria-label
  if (/open\s*\n?\s*\?\s*`Sprint「\$\{sprintName\}」の担当者 swim-lane Gantt を閉じる`/.test(ssd)) {
    findings.push({ level: 'info', message: `open 時 aria-label "閉じる" OK` })
  } else {
    findings.push({ level: 'warning', message: `open 時 aria-label なし` })
  }

  // 2. closed 時 aria-label
  if (/:\s*`Sprint「\$\{sprintName\}」の担当者 swim-lane Gantt を開く`/.test(ssd)) {
    findings.push({ level: 'info', message: `closed 時 aria-label "開く" OK` })
  } else {
    findings.push({ level: 'warning', message: `closed 時 aria-label なし` })
  }

  // 3. iter596 invariant: src-method aria-label 維持
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (/aria-label=\{`HTTP メソッド \(現在: \$\{/.test(ip)) {
    findings.push({ level: 'info', message: `iter596 invariant: src-method 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter596 invariant: 破壊` })
  }

  // 4. iter595 invariant: src-kind aria-label 維持
  if (/aria-label=\{`Source 種別 \(現在: \$\{/.test(ip)) {
    findings.push({ level: 'info', message: `iter595 invariant: src-kind 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter595 invariant: 破壊` })
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

  console.log(`\n=== Findings (swimlane-summary-aria-iter597) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
