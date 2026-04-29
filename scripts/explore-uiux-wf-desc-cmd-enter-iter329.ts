/**
 * Phase 6.15 loop iter 329 — workflows-panel の Workflow description Textarea
 * (id="wf-desc") にも Cmd/Ctrl+Enter で作成 を展開、iter313-318 続編。
 *
 * 課題: Workflow 作成 form は iter308 で noValidate 化済だが Textarea で
 *   default Enter は改行のため modifier 併用がないと name input から description
 *   textarea に Tab 移動した時点で Enter 押下では作成不可。
 *
 * fix: Textarea の onKeyDown で 4 ガード (Cmd/Ctrl+Enter + IME 確定中 skip +
 *   name.trim 必須 + !create.isPending) を追加、`preventDefault()` で改行抑制、
 *   `handleCreate()` 起動。Label と aria-label に "Cmd/Ctrl+Enter で作成" hint を
 *   append。
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
  const target = 'src/components/workflow/workflows-panel.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  const block = src.match(/<Textarea[\s\S]*?id="wf-desc"[\s\S]*?\/>/)
  if (!block) {
    findings.push({ level: 'error', message: `${target}: wf-desc Textarea not found` })
  } else {
    if (!/onKeyDown=/.test(block[0])) {
      findings.push({ level: 'warning', message: `${target}: wf-desc onKeyDown 不在` })
    }
    if (!/create\.isPending/.test(block[0])) {
      findings.push({ level: 'warning', message: `${target}: create.isPending ガード不在` })
    }
    if (!/Cmd\/Ctrl\+Enter で作成/.test(src)) {
      findings.push({ level: 'warning', message: `${target}: hint 文言不在` })
    }
  }

  if (findings.length === 0) {
    findings.push({ level: 'info', message: `${target}: wf-desc Cmd/Ctrl+Enter OK` })
  }

  console.log(`\n=== Findings (wf-desc-cmd-enter-iter329) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
