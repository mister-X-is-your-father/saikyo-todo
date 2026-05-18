/**
 * Phase 6.15 loop iter 974 (mode-M Mobile) — sprints-panel Sprint 期間 inline 編集 form の
 * 2 date Input (sprint-edit-start / sprint-edit-end) に enterKeyHint="next" / "send" を
 * 追加。iter949-973 enterKeyHint sweep 19 form 目、Sprint 期間 inline 編集 form を補完。
 *
 * 課題: iter960 で sprints-panel 新規 Sprint form は適用済だったが、既存 Sprint の
 *   期間 inline 編集 form (sprint-edit-start / sprint-edit-end) は enterKeyHint 未指定。
 *   iter941 で min-h-11 化のみ実施済、enterKeyHint は手付かずだった。
 *
 * fix: sprints-panel.tsx の inline 編集 2 Input に
 *   1. sprint-edit-start → enterKeyHint="next" (開始日 → 終了日 へ)
 *   2. sprint-edit-end → enterKeyHint="send" (終了日 → form 保存)
 *   +2/-0 行 (1 file)。視覚 / 動作不変。Mobile keyboard "次へ" / "送信" 翻訳で inline
 *   編集 flow 明示。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル。
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
  const target = 'src/components/workspace/sprints-panel.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // sprint-edit-start enterKeyHint="next"
  const startCtx = src.slice(
    src.indexOf('id={`sprint-edit-start-${sprint.id}`}'),
    src.indexOf('id={`sprint-edit-start-${sprint.id}`}') + 1200,
  )
  if (!/enterKeyHint="next"/.test(startCtx)) {
    findings.push({
      level: 'warning',
      message: `${target}: sprint-edit-start に enterKeyHint="next" 不在`,
    })
  } else {
    findings.push({ level: 'info', message: `sprint-edit-start enterKeyHint="next" OK` })
  }

  // sprint-edit-end enterKeyHint="send"
  const endCtx = src.slice(
    src.indexOf('id={`sprint-edit-end-${sprint.id}`}'),
    src.indexOf('id={`sprint-edit-end-${sprint.id}`}') + 1200,
  )
  if (!/enterKeyHint="send"/.test(endCtx)) {
    findings.push({
      level: 'warning',
      message: `${target}: sprint-edit-end に enterKeyHint="send" 不在`,
    })
  } else {
    findings.push({ level: 'info', message: `sprint-edit-end enterKeyHint="send" OK` })
  }

  // iter960 invariant: sprint-name/start/end 新規 form の enterKeyHint
  const nameCtx = src.slice(
    Math.max(0, src.indexOf('id="sprint-name"') - 50),
    src.indexOf('id="sprint-name"') + 700,
  )
  if (!/enterKeyHint="next"/.test(nameCtx)) {
    findings.push({ level: 'warning', message: `iter960 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter960 invariant OK` })
  }

  // iter941 invariant: sprint-edit-start min-h-11
  if (!/className="min-h-11 text-xs"/.test(src)) {
    findings.push({ level: 'warning', message: `iter941 invariant (min-h-11) 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter941 invariant OK` })
  }

  // iter973 invariant: item-edit-dialog editDod enterKeyHint
  const itemEditSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  const dodCtx = itemEditSrc.slice(
    Math.max(0, itemEditSrc.indexOf('id="editDod"') - 50),
    itemEditSrc.indexOf('id="editDod"') + 700,
  )
  if (!/enterKeyHint="send"/.test(dodCtx)) {
    findings.push({ level: 'warning', message: `iter973 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter973 invariant OK` })
  }

  // iter735 invariant
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

  console.log(`\n=== Findings (sprint-edit-period-enter-key-hint-iter974) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
