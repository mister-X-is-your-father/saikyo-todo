/**
 * Phase 6.15 loop iter 955 (mode-M Mobile) — decompose-proposals-panel の
 * 提案行 MUST checkbox label に `min-h-11` を追加 (mobile tap target 44x44 適合)。
 * iter943 items-board MUST label / iter946 engineer-trigger label / iter953 gantt-view
 * 2 checkbox label 同 pattern を decompose-proposals 提案行にも展開、checkbox label
 * tap-target sweep 4 件目。
 *
 * 課題: `<label className="flex items-center gap-1.5 text-xs">` + native checkbox + text-xs
 *   span だと label 全体 height < 44px、mobile 親指タップが不安定で誤タップ多発。
 *   隣接 size-sm Button / IMEInput.h-11 と列高さ不揃いで Card 内全体が visual jitter。
 *
 * fix: decompose-proposals-panel.tsx の MUST checkbox label に `min-h-11` を追加。
 *   `<label className="flex items-center gap-1.5 text-xs">` → `<label className="flex
 *   min-h-11 items-center gap-1.5 text-xs">`。+1/-1 行 (1 file、items-board iter943 +
 *   engineer-trigger iter946 + gantt-view iter953 と同 pattern)。視覚 styling / aria-label /
 *   data-testid 不変。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル 1 行。
 *
 * 検証: source-side regex で codify。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const target = 'src/components/workspace/decompose-proposals-panel.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // 1. MUST checkbox label に min-h-11
  if (!/<label className="flex min-h-11 items-center gap-1\.5 text-xs">/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: MUST checkbox label に min-h-11 不在`,
    })
  } else {
    findings.push({ level: 'info', message: `MUST checkbox label min-h-11 OK` })
  }

  // 2. checkbox + aria-label + visible "MUST" 維持 (regression 検出)
  if (
    !/type="checkbox"[\s\S]{0,400}MUST が ON/.test(src) ||
    !/<span className="font-medium text-red-700" aria-hidden="true">[\s\S]{0,20}MUST/.test(src)
  ) {
    findings.push({
      level: 'warning',
      message: `${target}: MUST checkbox + visible MUST span 破壊 (regression)`,
    })
  } else {
    findings.push({ level: 'info', message: `MUST checkbox + visible MUST span 維持 OK` })
  }

  // 3. items-board MUST checkbox label invariant (iter943)
  const itemsBoardSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  if (
    !/<label htmlFor="filter-must" className="flex min-h-11 items-center gap-1">/.test(
      itemsBoardSrc,
    )
  ) {
    findings.push({
      level: 'warning',
      message: `iter943 invariant: items-board MUST label min-h-11 破壊`,
    })
  } else {
    findings.push({ level: 'info', message: `iter943 invariant OK` })
  }

  // 4. iter954 invariant: auth-layout aria-label
  const authLayoutSrc = readFileSync(resolve(process.cwd(), 'src/app/(auth)/layout.tsx'), 'utf8')
  if (!/aria-label="認証 \(ログイン \/ サインアップ\)"/.test(authLayoutSrc)) {
    findings.push({ level: 'warning', message: `iter954 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter954 invariant OK` })
  }

  // 5. iter953 invariant: mock-entries empty state
  const entriesSrc = readFileSync(
    resolve(process.cwd(), 'src/app/mock-timesheet/entries/page.tsx'),
    'utf8',
  )
  if (!/data-testid="mock-entries-empty"/.test(entriesSrc)) {
    findings.push({ level: 'warning', message: `iter953 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter953 invariant OK` })
  }

  // 6. iter735 invariant
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({ level: 'info', message: `iter735 invariant OK (${tceMatches.length} 箇所)` })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant 破壊` })
  }

  console.log(`\n=== Findings (decompose-proposals-must-tap-target-iter955) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
