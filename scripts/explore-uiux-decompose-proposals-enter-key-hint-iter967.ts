/**
 * Phase 6.15 loop iter 967 (mode-M Mobile) — decompose-proposals-panel の編集 form の
 * 2 IMEInput (タイトル / DoD) に enterKeyHint="next" / "send" を追加。iter949-966
 * enterKeyHint sweep 12 form 目、decompose-proposals 編集 form 補完。
 *
 * 課題: 提案編集 form は 3 input + 1 checkbox を含む:
 *   - タイトル (IMEInput) → enterKeyHint 未指定
 *   - 説明 (Textarea, Cmd/Ctrl+Enter handler) → enterKeyHint 非適用
 *   - MUST checkbox (iter955 で min-h-11 適用済)
 *   - DoD (IMEInput, MUST=true 時のみ) → enterKeyHint 未指定
 *   タイトル / DoD だけ enterKeyHint 不足の不整合。
 *
 * fix: decompose-proposals-panel.tsx で
 *   1. タイトル IMEInput に enterKeyHint="next" (タイトル → 説明 Textarea へ)
 *   2. DoD IMEInput に enterKeyHint="send" (DoD → form 保存)
 *   +2/-0 行 (1 file)。視覚 / 動作不変。
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
  const target = 'src/components/workspace/decompose-proposals-panel.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // 1. タイトル IMEInput に enterKeyHint="next"
  const titleCtx = src.slice(
    src.indexOf('id={`p-title-${proposal.id}`}'),
    src.indexOf('id={`p-title-${proposal.id}`}') + 1500,
  )
  if (!/enterKeyHint="next"/.test(titleCtx)) {
    findings.push({
      level: 'warning',
      message: `${target}: p-title IMEInput に enterKeyHint="next" 不在`,
    })
  } else {
    findings.push({ level: 'info', message: `p-title enterKeyHint="next" OK` })
  }

  // 2. DoD IMEInput に enterKeyHint="send"
  const dodCtx = src.slice(
    src.indexOf('id={`p-dod-${proposal.id}`}'),
    src.indexOf('id={`p-dod-${proposal.id}`}') + 1500,
  )
  if (!/enterKeyHint="send"/.test(dodCtx)) {
    findings.push({
      level: 'warning',
      message: `${target}: p-dod IMEInput に enterKeyHint="send" 不在`,
    })
  } else {
    findings.push({ level: 'info', message: `p-dod enterKeyHint="send" OK` })
  }

  // 3. iter955 invariant: MUST checkbox label min-h-11 (本 file)
  if (!/<label className="flex min-h-11 items-center gap-1\.5 text-xs">/.test(src)) {
    findings.push({ level: 'warning', message: `iter955 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter955 invariant OK` })
  }

  // 4. iter966 invariant: template-items-editor enterKeyHint
  const templateSrc = readFileSync(
    resolve(process.cwd(), 'src/components/template/template-items-editor.tsx'),
    'utf8',
  )
  if (!/enterKeyHint="next"/.test(templateSrc) || !/enterKeyHint="send"/.test(templateSrc)) {
    findings.push({ level: 'warning', message: `iter966 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter966 invariant OK` })
  }

  // 5. iter735 invariant
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

  console.log(`\n=== Findings (decompose-proposals-enter-key-hint-iter967) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
