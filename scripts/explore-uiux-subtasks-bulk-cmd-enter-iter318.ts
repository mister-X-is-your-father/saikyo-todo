/**
 * Phase 6.15 loop iter 318 — subtasks-panel の bulk 追加 textarea にも
 * Cmd/Ctrl+Enter で追加 を展開、iter313-317 続編。
 *
 * 課題: ItemEditDialog の subtasks タブで使う bulk 追加 UI は改行区切り入力
 *   なので default Enter は newline 必須、modifier 併用が必須。Tab → button →
 *   Enter の冗長 keyboard UX が漏れていた。
 *
 * fix: id="subtasks-bulk" textarea の onKeyDown で 4 ガード (Cmd/Ctrl+Enter +
 *   IME 確定中 skip + bulkText.trim 必須 + !create.isPending) を追加、
 *   `preventDefault()` で改行抑制、`handleBulkAdd()` 起動。Label と
 *   aria-label に "Cmd/Ctrl+Enter で追加" hint を append。
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
  const target = 'src/components/workspace/subtasks-panel.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  const block = src.match(/<textarea[\s\S]*?id="subtasks-bulk"[\s\S]*?\/>/)
  if (!block) {
    findings.push({ level: 'error', message: `${target}: subtasks-bulk textarea not found` })
  } else {
    if (!/onKeyDown=/.test(block[0])) {
      findings.push({ level: 'warning', message: `${target}: onKeyDown 不在` })
    }
    if (!/create\.isPending/.test(block[0])) {
      findings.push({ level: 'warning', message: `${target}: create.isPending ガード不在` })
    }
    if (!/Cmd\/Ctrl\+Enter で追加/.test(src)) {
      findings.push({ level: 'warning', message: `${target}: hint 文言不在` })
    }
  }

  // iter313-317 invariant
  for (const [path, label] of [
    ['src/components/workspace/team-context-editor.tsx', 'iter313'],
    ['src/components/workspace/personal-period-view.tsx', 'iter314'],
    ['src/components/workspace/goals-panel.tsx', 'iter315'],
    ['src/components/workspace/sprints-panel.tsx', 'iter316'],
    ['src/components/workspace/decompose-proposals-panel.tsx', 'iter317'],
  ] as const) {
    const s = readFileSync(resolve(process.cwd(), path), 'utf8')
    if (!/\(e\.metaKey \|\| e\.ctrlKey\)/.test(s)) {
      findings.push({ level: 'warning', message: `${path}: ${label} 回帰` })
    }
  }

  if (findings.length === 0) {
    findings.push({ level: 'info', message: `${target}: subtasks-bulk Cmd/Ctrl+Enter OK` })
  }

  console.log(`\n=== Findings (subtasks-bulk-cmd-enter-iter318) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
