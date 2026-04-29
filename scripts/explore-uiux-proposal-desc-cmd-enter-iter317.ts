/**
 * Phase 6.15 loop iter 317 — decompose-proposals-panel の AI 提案編集 Textarea
 * (id="p-desc-<proposalId>") にも Cmd/Ctrl+Enter で保存 を展開、iter313-316 続編。
 *
 * 課題: AI が出した子タスク提案を採用前に微調整する編集 UI で、Textarea から
 *   作成 button まで Tab 移動が必要だった。iter306 で noValidate 化済だが
 *   modifier 併用 saving が漏れていた。
 *
 * fix: id="p-desc-..." Textarea の onKeyDown で 4 ガード (Cmd/Ctrl+Enter +
 *   IME 確定中 skip + title.trim 必須 + !update.isPending) を追加。
 *   `preventDefault()` で改行抑制、`handleSaveEdit()` 起動。Label と
 *   aria-label に "Cmd/Ctrl+Enter で保存" hint を append。
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
  const target = 'src/components/workspace/decompose-proposals-panel.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  const block = src.match(/<Textarea[\s\S]*?id=\{`p-desc-[\s\S]*?\/>/)
  if (!block) {
    findings.push({ level: 'error', message: `${target}: p-desc Textarea not found` })
  } else {
    if (!/onKeyDown=/.test(block[0])) {
      findings.push({ level: 'warning', message: `${target}: onKeyDown 不在` })
    }
    if (!/update\.isPending/.test(block[0])) {
      findings.push({ level: 'warning', message: `${target}: update.isPending ガード不在` })
    }
    if (!/Cmd\/Ctrl\+Enter で保存/.test(src)) {
      findings.push({ level: 'warning', message: `${target}: hint 文言不在` })
    }
  }

  // iter313-316 invariant
  for (const [path, label] of [
    ['src/components/workspace/team-context-editor.tsx', 'iter313'],
    ['src/components/workspace/personal-period-view.tsx', 'iter314'],
    ['src/components/workspace/goals-panel.tsx', 'iter315'],
    ['src/components/workspace/sprints-panel.tsx', 'iter316'],
  ] as const) {
    const s = readFileSync(resolve(process.cwd(), path), 'utf8')
    if (!/\(e\.metaKey \|\| e\.ctrlKey\)/.test(s)) {
      findings.push({ level: 'warning', message: `${path}: ${label} 回帰` })
    }
  }

  if (findings.length === 0) {
    findings.push({ level: 'info', message: `${target}: p-desc Cmd/Ctrl+Enter OK` })
  }

  console.log(`\n=== Findings (proposal-desc-cmd-enter-iter317) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
