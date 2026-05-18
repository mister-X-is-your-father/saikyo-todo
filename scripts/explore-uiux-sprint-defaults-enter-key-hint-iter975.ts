/**
 * Phase 6.15 loop iter 975 (mode-M Mobile) — sprints-panel Sprint デフォルト設定 form の
 * sprint-defaults-length Input に enterKeyHint="send" を追加。iter949-974 enterKeyHint
 * sweep 20 form 目、sprints-panel 全 3 form (新規 / 期間 inline 編集 / デフォルト設定) 完備。
 *
 * 課題: sprints-panel デフォルト設定 form は dow select + length Input の 2 field 構成。
 *   select は enterKeyHint 非適用、length Input が enterKeyHint 未指定で Mobile keyboard
 *   で「次の field か submit か」 user 判別不能だった。
 *
 * fix: sprints-panel.tsx の sprint-defaults-length Input に enterKeyHint="send" 追加
 *   (length は 2nd field、Enter で form 保存)。+1/-0 行 (1 file)。視覚 / 動作不変。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル。
 *
 * 検証: source-side regex で codify、sprints-panel 全 form enterKeyHint 完備確認。
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

  // sprint-defaults-length enterKeyHint="send"
  const ctx = src.slice(
    src.indexOf('id="sprint-defaults-length"'),
    src.indexOf('id="sprint-defaults-length"') + 1000,
  )
  if (!/enterKeyHint="send"/.test(ctx)) {
    findings.push({
      level: 'warning',
      message: `${target}: sprint-defaults-length に enterKeyHint="send" 不在`,
    })
  } else {
    findings.push({ level: 'info', message: `sprint-defaults-length enterKeyHint="send" OK` })
  }

  // iter960 invariant: 新規 Sprint form の enterKeyHint
  const nameCtx = src.slice(
    Math.max(0, src.indexOf('id="sprint-name"') - 50),
    src.indexOf('id="sprint-name"') + 700,
  )
  if (!/enterKeyHint="next"/.test(nameCtx)) {
    findings.push({ level: 'warning', message: `iter960 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter960 invariant OK` })
  }

  // iter974 invariant: inline 編集 enterKeyHint
  const startCtx = src.slice(
    src.indexOf('id={`sprint-edit-start-${sprint.id}`}'),
    src.indexOf('id={`sprint-edit-start-${sprint.id}`}') + 1200,
  )
  if (!/enterKeyHint="next"/.test(startCtx)) {
    findings.push({ level: 'warning', message: `iter974 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter974 invariant OK` })
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

  console.log(`\n=== Findings (sprint-defaults-enter-key-hint-iter975) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
