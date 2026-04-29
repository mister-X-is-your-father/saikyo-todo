/**
 * Phase 6.15 loop iter 312 — budget-panel の編集 UI を <form> 化 (Enter submit
 * + aria-busy) で iter303-308 noValidate sweep の続編。
 *
 * 課題: src/components/workspace/budget-panel.tsx の月次上限編集モードは <div>
 *   ラッパに 2 Input + Save/Cancel button (onClick 駆動)、`<form>` 要素無しで
 *   Enter キー submit 不可。Tab → Save button → Enter の遠回り keyboard UX、
 *   かつ pending 中の `aria-busy` 通知無し。iter38-41 (sprint/goal/template の
 *   <form> 化) + iter303-308 (noValidate sweep) と同じ pattern が漏れていた。
 *
 * fix: 編集モードの `<div>` を `<form noValidate aria-busy={update.isPending || undefined}
 *   onSubmit={(e) => { e.preventDefault(); void saveEdit() }}>` に置換。
 *   Save button を `type="submit"` (onClick 削除)、Cancel button に明示
 *   `type="button"` 付与で誤 submit 防止。これで Input 内 Enter で保存実行、
 *   pending 中は SR が "busy" を報告。
 *
 * 検証: source-side regex assert で codify。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const target = 'src/components/workspace/budget-panel.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // 1. <form> 要素が登場
  if (!/<form\b[\s\S]*?onSubmit=/.test(src)) {
    findings.push({ level: 'warning', message: `${target}: <form onSubmit> 不在` })
  }
  // 2. noValidate
  if (!/<form\b[\s\S]*?noValidate/.test(src)) {
    findings.push({ level: 'warning', message: `${target}: noValidate 不在` })
  }
  // 3. aria-busy
  if (!/aria-busy=\{update\.isPending \|\| undefined\}/.test(src)) {
    findings.push({ level: 'warning', message: `${target}: aria-busy 不在` })
  }
  // 4. Save button が type="submit"
  if (!/type="submit"[\s\S]*?budget-save-btn/.test(src)) {
    findings.push({ level: 'warning', message: `${target}: Save button が type="submit" でない` })
  }
  // 5. Cancel button が type="button" 明示
  const cancelBlock = src.match(/<Button[\s\S]*?onClick=\{\(\) => setEditing\(false\)\}/)
  if (cancelBlock && !/type="button"/.test(cancelBlock[0])) {
    findings.push({ level: 'warning', message: `${target}: Cancel button type="button" 不在` })
  }

  if (findings.length === 0) {
    findings.push({ level: 'info', message: `${target}: 編集 UI <form> 化 OK` })
  }

  console.log(`\n=== Findings (budget-panel-form-iter312) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
