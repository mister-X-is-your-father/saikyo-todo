/**
 * Phase 6.15 loop iter 605 (mode-D Desktop a11y) —
 * sprints-panel sprint-defaults-dow <select> aria-label に current 曜日埋込み。
 *
 * 課題: sprints-panel.tsx 行 881-892 の sprint-defaults-dow <select> は aria-label が
 *   "Sprint 基本曜日" の static で current value (dow 0-6) が aria 側で expose されない
 *   (browser native announce のみ)。ユーザに「現在は何曜開始?」 の確認に option dropdown を
 *   開く必要がある。
 *
 * fix (1 ファイル ~1 行差分):
 *   - aria-label 動的化: `Sprint 基本曜日 (現在: ${DOW_JA[dow] ?? dow}曜開始)`
 *
 * iter587-604 (動的 aria-label expose) pattern を sprint-defaults-dow に水平展開。
 *
 * 検証: source-side regex assert + iter515-604 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )

  // 1. sprint-defaults-dow aria-label 動的化
  if (/aria-label=\{`Sprint 基本曜日 \(現在: \$\{DOW_JA\[dow\] \?\? dow\}曜開始\)`\}/.test(sp)) {
    findings.push({ level: 'info', message: `sprint-defaults-dow aria-label 動的化 OK` })
  } else {
    findings.push({ level: 'warning', message: `sprint-defaults-dow aria-label 動的化なし` })
  }

  // 2. iter604 invariant: editKr aria-label 維持
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{\(\(\) => \{\s*\n?\s*const current = \(krsList\.data \?\? \[\]\)\.find\(/.test(
      ied,
    )
  ) {
    findings.push({ level: 'info', message: `iter604 invariant: editKr 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter604 invariant: 破壊` })
  }

  // 3. iter603 invariant: editSprint aria-label 維持
  if (
    /aria-label=\{\(\(\) => \{\s*\n?\s*const current = \(sprintsList\.data \?\? \[\]\)\.find\(/.test(
      ied,
    )
  ) {
    findings.push({ level: 'info', message: `iter603 invariant: editSprint 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter603 invariant: 破壊` })
  }

  // 4. iter600 invariant: sprint-risk item button aria-label 維持
  const srbw = readFileSync(
    resolve(process.cwd(), 'src/components/sprint/sprint-risk-board-widget.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`\$\{entry\.item\.title\} を開く \(risk score \$\{entry\.riskScore\}\$\{/.test(
      srbw,
    )
  ) {
    findings.push({ level: 'info', message: `iter600 invariant: sprint-risk 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter600 invariant: 破壊` })
  }

  // 5. iter589 invariant: status filter aria-label 維持
  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  if (/statusFilter === 'todo'\s*\n?\s*\?\s*'TODO'/.test(ib)) {
    findings.push({ level: 'info', message: `iter589 invariant: status filter 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter589 invariant: 破壊` })
  }

  console.log(`\n=== Findings (sprint-defaults-dow-aria-iter605) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
