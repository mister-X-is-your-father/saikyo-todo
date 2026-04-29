/**
 * Phase 6.15 loop iter 316 — sprints-panel の sprint-goal Textarea にも
 * Cmd/Ctrl+Enter で作成 ショートカット展開 (iter313-315 続編)。
 *
 * 課題: iter304 で sprints-panel の 3 form は noValidate 化済だが、Textarea 内
 *   default Enter は改行のため modifier 併用が無いと Tab → 作成 button → Enter
 *   の冗長 keyboard UX。
 *
 * fix: id="sprint-goal" Textarea の onKeyDown で 4 ガード (Cmd/Ctrl+Enter +
 *   IME 確定中 skip + name.trim 必須 + !createMut.isPending) を追加、
 *   `preventDefault()` で改行抑制、`handleCreate()` 起動。Label と aria-label
 *   に "Cmd/Ctrl+Enter で作成" hint を append。
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
  const target = 'src/components/workspace/sprints-panel.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  const block = src.match(/<Textarea[\s\S]*?id="sprint-goal"[\s\S]*?\/>/)
  if (!block) {
    findings.push({ level: 'error', message: `${target}: sprint-goal Textarea not found` })
  } else {
    if (!/onKeyDown=/.test(block[0])) {
      findings.push({ level: 'warning', message: `${target}: sprint-goal onKeyDown 不在` })
    }
    if (!/createMut\.isPending/.test(block[0])) {
      findings.push({ level: 'warning', message: `${target}: createMut.isPending ガード不在` })
    }
    if (!/Cmd\/Ctrl\+Enter で作成/.test(src)) {
      findings.push({ level: 'warning', message: `${target}: hint 文言不在` })
    }
  }

  // iter313/314/315 invariant
  for (const [path, label] of [
    ['src/components/workspace/team-context-editor.tsx', 'iter313'],
    ['src/components/workspace/personal-period-view.tsx', 'iter314'],
    ['src/components/workspace/goals-panel.tsx', 'iter315'],
  ] as const) {
    const s = readFileSync(resolve(process.cwd(), path), 'utf8')
    if (!/\(e\.metaKey \|\| e\.ctrlKey\)/.test(s)) {
      findings.push({ level: 'warning', message: `${path}: ${label} 回帰` })
    }
  }

  if (findings.length === 0) {
    findings.push({ level: 'info', message: `${target}: sprint-goal Cmd/Ctrl+Enter OK` })
  }

  console.log(`\n=== Findings (sprint-goal-cmd-enter-iter316) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
