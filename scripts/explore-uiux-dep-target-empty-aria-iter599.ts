/**
 * Phase 6.15 loop iter 599 (mode-D Desktop a11y) —
 * item-dependencies-panel dep-target <select> aria-label を「候補 0 件」 case で
 * empty-state hint に拡張 + 候補数の動的併記。
 *
 * 課題: item-dependencies-panel.tsx 行 200-208 の dep-target <select> は aria-label が
 *   "依存先 Item" の static で 候補 0 件の case (本 Item しか workspace に存在しない 等)
 *   で「なぜ選べないか」 が SR に伝わらない。option list が "Item を選択…" の 1 件
 *   だけになり、SR ユーザは「壊れた select?」 と誤解する可能性。
 *
 * fix (1 ファイル ~6 行差分):
 *   - aria-label を 2-state 動的化:
 *     - candidates.length === 0: 「依存先 Item — 選択可能な候補がありません (本 Item と
 *       循環しない他の Item を作成すると候補に出ます)」
 *     - else: `依存先 Item (候補 ${candidates.length} 件、本 Item と循環しないものに限定)`
 *
 * iter587-598 (動的 aria-label expose / empty-state hint) pattern を dep-target に
 * 水平展開、SR ユーザに「候補なし時の理由」 と「ある時の件数」 を 1 phrase で expose。
 *
 * 検証: source-side regex assert + iter515-598 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const idp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-dependencies-panel.tsx'),
    'utf8',
  )

  // 1. candidates 0 件時 empty-state hint
  if (
    /candidates\.length === 0\s*\n?\s*\?\s*'依存先 Item — 選択可能な候補がありません \(本 Item と循環しない他の Item を作成すると候補に出ます\)'/.test(
      idp,
    )
  ) {
    findings.push({ level: 'info', message: `dep-target empty-state hint OK` })
  } else {
    findings.push({ level: 'warning', message: `dep-target empty-state hint なし` })
  }

  // 2. candidates あり時 候補数併記
  if (
    /:\s*`依存先 Item \(候補 \$\{candidates\.length\} 件、本 Item と循環しないものに限定\)`/.test(
      idp,
    )
  ) {
    findings.push({ level: 'info', message: `dep-target 候補数併記 OK` })
  } else {
    findings.push({ level: 'warning', message: `dep-target 候補数併記なし` })
  }

  // 3. iter598 invariant: team-capacity summary 維持
  const tcp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-capacity-panel.tsx'),
    'utf8',
  )
  if (/open\s*\n?\s*\?\s*'チームメンバー 余裕時間 \(今日 \/ 今週\) を閉じる'/.test(tcp)) {
    findings.push({ level: 'info', message: `iter598 invariant: team-capacity 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter598 invariant: 破壊` })
  }

  // 4. iter597 invariant: sprint-swimlane summary 維持
  const ssd = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprint-swimlane-disclosure.tsx'),
    'utf8',
  )
  if (/open\s*\n?\s*\?\s*`Sprint「\$\{sprintName\}」の担当者 swim-lane Gantt を閉じる`/.test(ssd)) {
    findings.push({ level: 'info', message: `iter597 invariant: sprint-swimlane 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter597 invariant: 破壊` })
  }

  // 5. iter594 invariant: dep-target option statusJa 維持
  if (/const statusJa = getStatusVisual\(c\.status\)\.shortLabel/.test(idp)) {
    findings.push({ level: 'info', message: `iter594 invariant: dep-target statusJa 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter594 invariant: 破壊` })
  }

  // 6. iter593 invariant: dep-kind aria-label 維持
  if (/aria-label=\{`依存の種類 \(現在: \$\{/.test(idp)) {
    findings.push({ level: 'info', message: `iter593 invariant: dep-kind 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter593 invariant: 破壊` })
  }

  console.log(`\n=== Findings (dep-target-empty-aria-iter599) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
