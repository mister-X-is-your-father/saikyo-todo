/**
 * Phase 6.15 loop iter 770 (mode-D Desktop a11y) —
 * sprints-panel sprint-defaults-dow select に required + aria-required を追加。
 *
 * 課題: sprints-panel.tsx 行 931-944 の sprint-defaults-dow select は実質 required
 *   (週の起動曜日は必須選択) だが HTML required / aria-required 属性が無い。SR ユーザは
 *   この select が必須かどうか分からない。enum value 0-6 で必ず選択されているので機能上
 *   問題ないが、a11y attribute としては明示すべき (sprint-name 等の他 required input と
 *   対称性を保つ)。
 *
 * fix (1 ファイル ~2 行差分):
 *   - select に `required` + `aria-required="true"` 追加
 *
 * 検証: source-side regex assert + iter735-769 invariant cross-check。
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
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (
    /id="sprint-defaults-dow"\s*\n\s*value=\{dow\}\s*\n\s*onChange=\{[^}]+\}\s*\n\s*className="[^"]+"\s*\n\s*required\s*\n\s*aria-required="true"/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `sprint-defaults-dow select required + aria-required 追加 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-defaults-dow select required 追加 不完全`,
    })
  }

  // iter769 invariant: comment-thread 編集 Textarea aria-keyshortcuts (Cmd+Enter Escape)
  const ct = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/comment-thread.tsx'),
    'utf8',
  )
  if (/aria-keyshortcuts="Meta\+Enter Control\+Enter Escape"/.test(ct)) {
    findings.push({
      level: 'info',
      message: `iter769 invariant: comment-thread 編集 Textarea aria-keyshortcuts 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter769 invariant: 破壊` })
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

  console.log(`\n=== Findings (sprint-defaults-dow-required-iter770) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
