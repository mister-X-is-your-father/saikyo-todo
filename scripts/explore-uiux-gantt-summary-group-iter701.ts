/**
 * Phase 6.15 loop iter 701 (mode-D Desktop a11y) —
 * gantt-view project summary banner に role="group" + aria-label 追加
 * (Gantt header の summary 6 chip を SR で 1 group として識別)。
 *
 * 課題: gantt-view.tsx 行 297-300 の `<div data-testid="gantt-summary">` は
 *   表示範囲 / Item 数 / CPM 期間 / critical / baseline / 遅延 の 6 chip を
 *   横並びで表示するが、role / aria-label 無し。SR ナビゲーションで
 *   「6 個の chip がただ並んでいる」状態で group context 不明。
 *
 * fix (1 ファイル ~3 行差分):
 *   - role="group" + aria-label 追加 (banner 内の chip 群を 1 group として明示)
 *
 * 検証: source-side regex assert + iter515-700 invariant cross-check。
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

  // 1. gantt-summary に role=group + aria-label
  if (
    /data-testid="gantt-summary"\s*\n\s*className="bg-muted\/40 text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 border-b px-3 py-1\.5 text-xs"\s*\n\s*role="group"\s*\n\s*aria-label="Gantt project summary \(表示範囲 \/ Item 数 \/ CPM 期間 \/ critical \/ baseline \/ 遅延\)"/.test(
      gv,
    )
  ) {
    findings.push({ level: 'info', message: `gantt-summary role=group + aria-label OK` })
  } else {
    findings.push({ level: 'warning', message: `gantt-summary role=group + aria-label なし` })
  }

  // 2. iter694 invariant: critical chip data-testid 維持
  if (/data-testid="gantt-summary-critical"/.test(gv)) {
    findings.push({ level: 'info', message: `iter694 invariant: critical chip 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter694 invariant: 破壊` })
  }

  // 3. iter677 invariant: gantt-jump-today focus 維持
  if (
    /text-foreground hover:bg-muted focus-visible:ring-ring relative rounded border px-2 py-0\.5 text-xs before:absolute before:-inset-3 before:content-\[''\] focus-visible:ring-2 focus-visible:outline-none/.test(
      gv,
    )
  ) {
    findings.push({ level: 'info', message: `iter677 invariant: gantt-jump-today focus 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter677 invariant: 破壊` })
  }

  // 4. iter700 invariant: template-items ul aria-label 維持
  const tie = readFileSync(
    resolve(process.cwd(), 'src/components/template/template-items-editor.tsx'),
    'utf8',
  )
  if (/aria-label=\{`Template 子 Item 一覧 \$\{items\.data!\.length\} 件`\}/.test(tie)) {
    findings.push({ level: 'info', message: `iter700 invariant: template-items ul 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter700 invariant: 破壊` })
  }

  // 5. iter662 invariant: items-board filter group 維持
  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  if (/role="group"\s*\n\s*aria-label="Item の絞り込み/.test(ib)) {
    findings.push({ level: 'info', message: `iter662 invariant: filter group 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter662 invariant: 破壊` })
  }

  console.log(`\n=== Findings (gantt-summary-group-iter701) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
