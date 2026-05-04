/**
 * Phase 6.15 loop iter 769 (mode-D Desktop a11y) —
 * comment-thread の 編集 Textarea (display=editing) に aria-keyshortcuts を追加。
 *
 * 課題: comment-thread.tsx 行 209-242 の編集 Textarea は Cmd/Ctrl+Enter で保存、Escape
 *   で編集破棄の 2 shortcut を持つが aria-keyshortcuts attribute が無い。aria-label
 *   テキストには記載されているが SR の dedicated channel として読まれない。
 *   iter736 では post Textarea に aria-keyshortcuts を追加済 だが、編集 Textarea は別 element。
 *
 * fix (1 ファイル ~1 行差分):
 *   - 編集 Textarea に `aria-keyshortcuts="Meta+Enter Control+Enter Escape"` 追加
 *
 * 検証: source-side regex assert + iter735-768 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ct = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/comment-thread.tsx'),
    'utf8',
  )
  if (/aria-keyshortcuts="Meta\+Enter Control\+Enter Escape"/.test(ct)) {
    findings.push({
      level: 'info',
      message: `comment-thread 編集 Textarea aria-keyshortcuts (Cmd+Enter Escape) 追加 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `comment-thread 編集 Textarea aria-keyshortcuts 追加 不完全`,
    })
  }

  // iter736 invariant: post Textarea aria-keyshortcuts (依然 4 箇所 = post + edit + post button + save button)
  const ctMatches = ct.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (ctMatches.length >= 3) {
    findings.push({
      level: 'info',
      message: `iter736 invariant: comment-thread post Textarea + buttons aria-keyshortcuts 維持 OK (${ctMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter736 invariant: 破壊` })
  }

  // iter768 invariant: assignee-picker
  const ap = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/assignee-picker.tsx'),
    'utf8',
  )
  if (/aria-label="アサイン候補を検索 \(workspace メンバー \/ AI Agent\)"/.test(ap)) {
    findings.push({
      level: 'info',
      message: `iter768 invariant: assignee-picker CommandInput aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter768 invariant: 破壊` })
  }

  // iter752 invariant: backlog-view empty state
  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )
  if (/role="status"\s*\n\s*aria-live="polite"/.test(bv)) {
    findings.push({
      level: 'info',
      message: `iter752 invariant: backlog-view empty state 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter752 invariant: 破壊` })
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

  console.log(`\n=== Findings (comment-edit-textarea-keyshortcuts-iter769) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
