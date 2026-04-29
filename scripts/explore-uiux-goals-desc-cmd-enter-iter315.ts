/**
 * Phase 6.15 loop iter 315 — goals-panel の Goal description Textarea にも
 * Cmd/Ctrl+Enter で作成 ショートカット展開 (iter313/314 続編)。
 *
 * 課題: iter305 で goals-panel form は noValidate / submit 化済だが、Textarea 内
 *   default Enter は改行 (form submit 不可)、modifier 併用がないと textarea 内
 *   から作成 button まで Tab する必要があった。Slack / GitHub / Notion 標準の
 *   Cmd/Ctrl+Enter ショートカットが Textarea にも欲しい。
 *
 * fix: Textarea の onKeyDown で `(metaKey || ctrlKey) + Enter` かつ
 *   `!nativeEvent.isComposing` (IME) かつ `title.trim()` (zod required 相当の
 *   pre-check) かつ `!createMut.isPending` (二重送信防止) で `handleCreate()` を
 *   呼出。`preventDefault()` で改行を抑制。Label と aria-label に
 *   "Cmd/Ctrl+Enter で作成" hint を append。
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
  const target = 'src/components/workspace/goals-panel.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // goal-desc Textarea に onKeyDown 含む
  const block = src.match(/<Textarea[\s\S]*?id="goal-desc"[\s\S]*?\/>/)
  if (!block) {
    findings.push({ level: 'error', message: `${target}: goal-desc Textarea not found` })
  } else {
    if (!/onKeyDown=/.test(block[0])) {
      findings.push({ level: 'warning', message: `${target}: goal-desc onKeyDown 不在` })
    }
    if (!/createMut\.isPending/.test(block[0])) {
      findings.push({ level: 'warning', message: `${target}: createMut.isPending ガード不在` })
    }
    if (!/Cmd\/Ctrl\+Enter で作成/.test(src)) {
      findings.push({ level: 'warning', message: `${target}: hint 文言不在` })
    }
  }

  // iter313/314 invariant
  const tc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  if (!/\(e\.metaKey \|\| e\.ctrlKey\)/.test(tc)) {
    findings.push({ level: 'warning', message: 'team-context-editor.tsx: iter313 回帰' })
  }
  const pp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/personal-period-view.tsx'),
    'utf8',
  )
  if (!/\(e\.metaKey \|\| e\.ctrlKey\)/.test(pp)) {
    findings.push({ level: 'warning', message: 'personal-period-view.tsx: iter314 回帰' })
  }

  if (findings.length === 0) {
    findings.push({ level: 'info', message: `${target}: goal-desc Cmd/Ctrl+Enter OK` })
  }

  console.log(`\n=== Findings (goals-desc-cmd-enter-iter315) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
