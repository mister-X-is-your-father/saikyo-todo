/**
 * Phase 6.15 loop iter 956 (mode-M Mobile) — item-edit-dialog の MUST checkbox label
 * に `min-h-11` を追加 (mobile tap target 44x44 適合)。iter943 items-board MUST /
 * iter946 engineer-trigger / iter953 gantt-view / iter955 decompose-proposals 同 pattern を
 * item-edit-dialog にも展開、checkbox label tap-target sweep 5 件目。
 *
 * 課題: item-edit-dialog の MUST checkbox label `flex cursor-pointer items-center gap-2 text-sm`
 *   は cursor-pointer はあるが min-h 指定なしで label height < 44px、mobile 親指タップ不安定。
 *   dialog 内で隣接 Button / IMEInput.h-11 と高さ不揃い。
 *
 * fix: item-edit-dialog.tsx の MUST checkbox label に `min-h-11` を class 追加。
 *   `<label className="flex cursor-pointer items-center gap-2 text-sm">` →
 *   `<label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">`。
 *   +1/-1 行 (1 file)。視覚 / aria-label / data-testid 不変。
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
  const target = 'src/components/workspace/item-edit-dialog.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // 1. MUST checkbox label に min-h-11
  if (
    !/<label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">[\s\S]{0,400}edit-item-must/.test(
      src,
    )
  ) {
    findings.push({
      level: 'warning',
      message: `${target}: MUST checkbox label (edit-item-must) に min-h-11 不在`,
    })
  } else {
    findings.push({ level: 'info', message: `MUST checkbox label min-h-11 OK` })
  }

  // 2. data-testid="edit-item-must" 維持 (regression 検出)
  if (!/data-testid="edit-item-must"/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: data-testid="edit-item-must" 消滅 (regression)`,
    })
  } else {
    findings.push({ level: 'info', message: `data-testid="edit-item-must" 維持 OK` })
  }

  // 3. iter955 invariant: decompose-proposals MUST label
  const decomposeSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (!/<label className="flex min-h-11 items-center gap-1\.5 text-xs">/.test(decomposeSrc)) {
    findings.push({ level: 'warning', message: `iter955 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter955 invariant OK` })
  }

  // 4. iter954 invariant: auth-layout aria-label
  const authLayoutSrc = readFileSync(resolve(process.cwd(), 'src/app/(auth)/layout.tsx'), 'utf8')
  if (!/aria-label="認証 \(ログイン \/ サインアップ\)"/.test(authLayoutSrc)) {
    findings.push({ level: 'warning', message: `iter954 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter954 invariant OK` })
  }

  // 5. iter943 invariant: items-board MUST label
  const itemsBoardSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  if (
    !/<label htmlFor="filter-must" className="flex min-h-11 items-center gap-1">/.test(
      itemsBoardSrc,
    )
  ) {
    findings.push({ level: 'warning', message: `iter943 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter943 invariant OK` })
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

  console.log(`\n=== Findings (item-edit-must-tap-target-iter956) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
