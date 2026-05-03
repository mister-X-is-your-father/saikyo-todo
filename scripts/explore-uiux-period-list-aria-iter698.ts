/**
 * Phase 6.15 loop iter 698 (mode-D Desktop a11y) —
 * personal-period-view ul (期間別 Item 一覧) に aria-label 追加
 * (iter697 / iter696 の list 命名 sweep 続き)。
 *
 * 課題: personal-period-view.tsx 行 211 の `<ul>` (filtered Item 一覧) は data-testid あるが
 *   aria-label 無し。SR が「リスト N 項目」とだけ announce、どんなリストか不明。
 *
 * fix (1 ファイル ~5 行差分):
 *   - ul に `aria-label={`${periodLabelJa(period)} 期間の Item 一覧 ${filtered.length} 件`}`
 *
 * 検証: source-side regex assert + iter515-697 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ppv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/personal-period-view.tsx'),
    'utf8',
  )

  // 1. period-items ul aria-label
  if (
    /data-testid=\{`period-items-\$\{period\}`\}\s*\n\s*aria-label=\{`\$\{periodLabelJa\(period\)\} 期間の Item 一覧 \$\{filtered\.length\} 件`\}/.test(
      ppv,
    )
  ) {
    findings.push({ level: 'info', message: `period-items ul aria-label OK` })
  } else {
    findings.push({ level: 'warning', message: `period-items ul aria-label なし` })
  }

  // 2. iter697 invariant: keybindings dl labelledby 維持
  const km = readFileSync(
    resolve(process.cwd(), 'src/components/shared/keybindings-help-modal.tsx'),
    'utf8',
  )
  if (/aria-labelledby=\{headingId\}/.test(km)) {
    findings.push({ level: 'info', message: `iter697 invariant: keybindings dl 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter697 invariant: 破壊` })
  }

  // 3. iter696 invariant: sprint-retro dl 維持
  const srw = readFileSync(
    resolve(process.cwd(), 'src/components/sprint/sprint-retro-widget.tsx'),
    'utf8',
  )
  if (/aria-label="計画 vs 納品 \(計画 \/ 納品 \/ 差分\)"/.test(srw)) {
    findings.push({ level: 'info', message: `iter696 invariant: sprint-retro dl 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter696 invariant: 破壊` })
  }

  // 4. iter694 invariant: gantt critical chip 維持
  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')
  if (/data-testid="gantt-summary-critical"/.test(gv)) {
    findings.push({ level: 'info', message: `iter694 invariant: gantt-summary-critical 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter694 invariant: 破壊` })
  }

  // 5. iter692 invariant: 個別 Sprint optgroup 維持
  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  if (
    /\(sprintsList\.data \?\? \[\]\)\.length > 0 && \(\s*\n\s*<optgroup label="個別 Sprint">/.test(
      ib,
    )
  ) {
    findings.push({ level: 'info', message: `iter692 invariant: 個別 Sprint optgroup 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter692 invariant: 破壊` })
  }

  console.log(`\n=== Findings (period-list-aria-iter698) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
