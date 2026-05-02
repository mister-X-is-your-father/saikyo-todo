/**
 * Phase 6.15 loop iter 600 (mode-D Desktop a11y) —
 * sprint-risk-board-widget item button aria-label に risk score + 理由数を埋込み。
 *
 * 課題: sprint-risk-board-widget.tsx 行 111-115 の item button は aria-label が
 *   `${entry.item.title} を開く` のみで、risk score / 理由数が visible chip 側
 *   (SeverityChip + reasons <ul>) にしかない。SR ユーザは title 行 button focus
 *   時に「リスク高い? 低い? 理由あり?」 を 1 phrase で取得できず、隣接 chip と
 *   reasons <ul> を別途 focus 移動して読まないと全体像が分からない。
 *
 * fix (1 ファイル ~3 行差分):
 *   - aria-label 動的化:
 *     `${title} を開く (risk score ${score}${reasons.length > 0 ? ` / 理由 ${N} 件` : ''})`
 *
 * iter587-599 (動的 aria-label expose) pattern を sprint-risk-board に水平展開、
 * SR が title button 1 focus で「title + score + 理由数」 を 1 phrase で取得。
 *
 * 検証: source-side regex assert + iter515-599 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const srbw = readFileSync(
    resolve(process.cwd(), 'src/components/sprint/sprint-risk-board-widget.tsx'),
    'utf8',
  )

  // 1. aria-label に risk score 埋込み
  if (
    /aria-label=\{`\$\{entry\.item\.title\} を開く \(risk score \$\{entry\.riskScore\}\$\{/.test(
      srbw,
    )
  ) {
    findings.push({ level: 'info', message: `risk score 埋込み OK` })
  } else {
    findings.push({ level: 'warning', message: `risk score 埋込みなし` })
  }

  // 2. aria-label に reasons.length 条件埋込み
  if (/entry\.reasons\.length > 0 \? ` \/ 理由 \$\{entry\.reasons\.length\} 件` : ''/.test(srbw)) {
    findings.push({ level: 'info', message: `reasons 件数条件埋込み OK` })
  } else {
    findings.push({ level: 'warning', message: `reasons 件数条件なし` })
  }

  // 3. iter599 invariant: dep-target empty-state hint 維持
  const idp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-dependencies-panel.tsx'),
    'utf8',
  )
  if (/candidates\.length === 0\s*\n?\s*\?\s*'依存先 Item — 選択可能な候補がありません/.test(idp)) {
    findings.push({ level: 'info', message: `iter599 invariant: dep-target empty-state 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter599 invariant: 破壊` })
  }

  // 4. iter598 invariant: team-capacity summary 維持
  const tcp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-capacity-panel.tsx'),
    'utf8',
  )
  if (/open\s*\n?\s*\?\s*'チームメンバー 余裕時間 \(今日 \/ 今週\) を閉じる'/.test(tcp)) {
    findings.push({ level: 'info', message: `iter598 invariant: team-capacity 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter598 invariant: 破壊` })
  }

  // 5. iter594 invariant: dep-target option statusJa 維持
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

  console.log(`\n=== Findings (risk-item-aria-iter600) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
