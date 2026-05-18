/**
 * Phase 6.15 loop iter 957 (mode-M Mobile) — template-items-editor の MUST checkbox
 * label に `min-h-11` を追加 (mobile tap target 44x44 適合)。iter943/946/953/955/956
 * 同 pattern を template-items-editor にも展開、checkbox label tap-target sweep 6 件目。
 *
 * 課題: `<label className="flex items-center gap-1 text-sm">` + native checkbox + text-sm
 *   span だと label 全体 height < 44px、mobile 親指タップ不安定。template 編集中 user
 *   が誤タップで MUST を切り替えてしまうリスク。
 *
 * fix: template-items-editor.tsx の MUST checkbox label に `min-h-11` を class 追加
 *   (`flex items-center gap-1 text-sm` → `flex min-h-11 items-center gap-1 text-sm`)。
 *   +1/-1 行 (1 file)。視覚 / aria-label 不変。
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
  const target = 'src/components/template/template-items-editor.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // 1. MUST checkbox label に min-h-11
  if (!/<label className="flex min-h-11 items-center gap-1 text-sm">/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: MUST checkbox label に min-h-11 不在`,
    })
  } else {
    findings.push({ level: 'info', message: `MUST checkbox label min-h-11 OK` })
  }

  // 2. visible "MUST (絶対落とさない)" 維持
  if (!/<span aria-hidden="true">MUST \(絶対落とさない\)<\/span>/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: visible "MUST (絶対落とさない)" span 破壊 (regression)`,
    })
  } else {
    findings.push({ level: 'info', message: `visible MUST span 維持 OK` })
  }

  // 3. iter956 invariant: item-edit-dialog MUST label
  const itemEditSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (
    !/<label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">[\s\S]{0,400}edit-item-must/.test(
      itemEditSrc,
    )
  ) {
    findings.push({ level: 'warning', message: `iter956 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter956 invariant OK` })
  }

  // 4. iter955 invariant: decompose-proposals MUST label
  const decomposeSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (!/<label className="flex min-h-11 items-center gap-1\.5 text-xs">/.test(decomposeSrc)) {
    findings.push({ level: 'warning', message: `iter955 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter955 invariant OK` })
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

  // 6. iter954 invariant: auth-layout aria-label
  const authLayoutSrc = readFileSync(resolve(process.cwd(), 'src/app/(auth)/layout.tsx'), 'utf8')
  if (!/aria-label="認証 \(ログイン \/ サインアップ\)"/.test(authLayoutSrc)) {
    findings.push({ level: 'warning', message: `iter954 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter954 invariant OK` })
  }

  // 7. iter735 invariant
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

  console.log(`\n=== Findings (template-items-must-tap-target-iter957) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
