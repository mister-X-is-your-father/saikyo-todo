/**
 * Phase 6.15 loop iter 747 (mode-D Desktop a11y) —
 * subtasks-panel の bulk 追加 textarea に aria-keyshortcuts を追加
 * (iter735-742 sweep の漏れ補完、native textarea 系)。
 *
 * 課題: subtasks-panel.tsx 行 524-555 の <textarea id="subtasks-bulk"> (子タスクを
 *   改行区切りで bulk 追加) は onKeyDown で Cmd/Ctrl+Enter trap して追加するが、
 *   aria-keyshortcuts attribute が無く、同 component の追加 button (行 568) は
 *   付与済で非対称。shadcn の Textarea component ではなく native <textarea> なので
 *   workspace-textarea sweep (iter735-741) からも漏れていた。
 *
 * fix (1 ファイル ~1 行差分):
 *   - <textarea> に `aria-keyshortcuts="Meta+Enter Control+Enter"` を追加
 *
 * 検証: source-side regex assert + iter735-746 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/subtasks-panel.tsx'),
    'utf8',
  )
  const spMatches = sp.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (spMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `subtasks-panel bulk textarea aria-keyshortcuts 追加 OK (${spMatches.length} 箇所、Textarea + Add button)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `subtasks-panel aria-keyshortcuts 不完全 (${spMatches.length} 箇所のみ)`,
    })
  }

  // iter746 invariant: schedule-item-picker
  const sip = readFileSync(
    resolve(process.cwd(), 'src/components/schedule/schedule-item-picker.tsx'),
    'utf8',
  )
  if (/aria-keyshortcuts="Escape"/.test(sip)) {
    findings.push({
      level: 'info',
      message: `iter746 invariant: schedule-item-picker aria-keyshortcuts="Escape" 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter746 invariant: 破壊` })
  }

  // iter743 invariant: quick-add IMEInput
  const qa = readFileSync(resolve(process.cwd(), 'src/components/workspace/quick-add.tsx'), 'utf8')
  const qaMatches = qa.match(/aria-keyshortcuts="Enter"/g) ?? []
  if (qaMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter743 invariant: quick-add aria-keyshortcuts 維持 OK (${qaMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter743 invariant: 破壊` })
  }

  // iter736 invariant: comment-thread
  const ct = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/comment-thread.tsx'),
    'utf8',
  )
  const ctMatches = ct.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (ctMatches.length >= 3) {
    findings.push({
      level: 'info',
      message: `iter736 invariant: comment-thread aria-keyshortcuts 維持 OK (${ctMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter736 invariant: 破壊` })
  }

  // iter735 invariant: team-context-editor
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter735 invariant: team-context-editor aria-keyshortcuts 維持 OK (${tceMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant: 破壊` })
  }

  console.log(`\n=== Findings (subtasks-bulk-keyshortcuts-iter747) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
