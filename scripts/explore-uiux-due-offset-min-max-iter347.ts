/**
 * Phase 6.15 loop iter 347 — template-items-editor の dueOffset number input に
 * min={0} max={365} step={1} inputMode="numeric" を追加。
 *
 * 課題: 期日 offset 数値入力は HTML5 制約無しで負の値 / 1 年超 / 小数の誤入力を
 *   抑止できない。schema 側で正整数制約だが UX 早期段階で防ぎたい。mobile keyboard
 *   は inputMode 無いと alphanumeric が出てしまう。
 *
 * fix: 妥当範囲 0-365 日 + step=1 + inputMode="numeric" を追加 (4 行)。
 *   aria-label の文末に "0-365" 範囲を append。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル。
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
  const target = 'src/components/template/template-items-editor.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  if (!/min=\{0\}/.test(src) || !/max=\{365\}/.test(src)) {
    findings.push({ level: 'warning', message: `${target}: dueOffset min/max 不在` })
  }
  if (!/step=\{1\}/.test(src)) {
    findings.push({ level: 'warning', message: `${target}: dueOffset step=1 不在` })
  }
  if (!/inputMode="numeric"/.test(src)) {
    findings.push({ level: 'warning', message: `${target}: inputMode="numeric" 不在` })
  }

  if (findings.length === 0) {
    findings.push({ level: 'info', message: `${target}: dueOffset min/max/step/inputMode OK` })
  }

  console.log(`\n=== Findings (due-offset-min-max-iter347) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
