/**
 * Phase 6.15 loop iter 971 (mode-M Mobile) — workflows-panel 新規 Workflow form の
 * wf-name IMEInput に enterKeyHint="next" を追加。iter949-970 enterKeyHint sweep
 * 16 form 目、workflows 作成 form 補完。
 *
 * 課題: workflows-panel 新規 Workflow form は wf-name (IMEInput) + wf-desc (Textarea,
 *   Cmd/Ctrl+Enter handler) で構成。wf-name に enterKeyHint 未指定、Mobile keyboard
 *   で「次の field か submit か」 user 判別不能だった。
 *
 * fix: workflows-panel.tsx の wf-name IMEInput に enterKeyHint="next" を追加
 *   (名前 → 説明 Textarea へ flow、Textarea は Cmd/Ctrl+Enter handler のため
 *   enterKeyHint 非適用)。+1/-0 行 (1 file)。視覚 / 動作不変。
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
  const target = 'src/components/workflow/workflows-panel.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // wf-name に enterKeyHint="next"
  const ctx = src.slice(src.indexOf('id="wf-name"'), src.indexOf('id="wf-name"') + 800)
  if (!/enterKeyHint="next"/.test(ctx)) {
    findings.push({
      level: 'warning',
      message: `${target}: wf-name に enterKeyHint="next" 不在`,
    })
  } else {
    findings.push({ level: 'info', message: `wf-name enterKeyHint="next" OK` })
  }

  // iter970 invariant: instantiate-form enterKeyHint
  const instantiateSrc = readFileSync(
    resolve(process.cwd(), 'src/components/template/instantiate-form.tsx'),
    'utf8',
  )
  if (!/enterKeyHint="next"/.test(instantiateSrc)) {
    findings.push({ level: 'warning', message: `iter970 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter970 invariant OK` })
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

  console.log(`\n=== Findings (workflows-panel-enter-key-hint-iter971) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
