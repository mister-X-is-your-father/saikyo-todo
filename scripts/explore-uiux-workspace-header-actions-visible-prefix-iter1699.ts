/**
 * Phase 6.15 loop iter 1699 — workspace-header の actions group aria-label を
 * literal title prefix に統一 (iter1697 / iter1698 visible-prefix sweep の
 * 同 file 内 divergence 解消)。
 *
 * 課題: src/components/workspace/workspace-header.tsx 65 行 <div role="group"> の
 *   aria-label `「${title}」 ヘッダー操作 — ページ固有アクション / ユーティリティ` は
 *   先頭が「 (U+300C) quote。同 file 29 行 <header> aria-label は
 *   `${title} — Workspace` (literal-prefix) で、同 page 内 sibling landmark の
 *   prefix convention が divergent。SR landmark navigation 時 header と group で
 *   読み上げ pattern が揃わない (一方は `${title}`、他方は `「${title}」`)。
 *
 * fix: 「${title}」 → ${title} (1 line + 5 line comment)。
 *   - parent <header> (line 29) と prefix が揃う
 *   - iter1697 backlog sortable <th> / iter1698 subtask drag handle と同 pattern
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

  const target = 'src/components/workspace/workspace-header.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // 1. 旧 quote-prefix 不在
  if (
    /aria-label=\{`「\$\{title\}」 ヘッダー操作 — ページ固有アクション \/ ユーティリティ`\}/.test(
      src,
    )
  ) {
    findings.push({
      level: 'warning',
      message: `${target}: 旧 quote-prefix aria-label が残存`,
    })
  } else {
    findings.push({ level: 'info', message: 'group 旧 quote-prefix 除去 OK' })
  }

  // 2. 新 literal-prefix 存在
  if (
    !/aria-label=\{`\$\{title\} — ヘッダー操作 \(ページ固有アクション \/ ユーティリティ\)`\}/.test(
      src,
    )
  ) {
    findings.push({
      level: 'warning',
      message: `${target}: 新 literal-prefix aria-label が無い`,
    })
  } else {
    findings.push({ level: 'info', message: 'group 新 literal-prefix aria-label OK' })
  }

  // 3. parent <header> aria-label invariant 維持 (iter1563 で確立済)
  if (!/aria-label=\{`\$\{title\} — Workspace`\}/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: parent <header> iter1563 aria-label invariant が壊れた`,
    })
  }

  // 4. iter1698 subtasks-panel drag handle aria-label invariant
  const subtasks = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/subtasks-panel.tsx'),
    'utf8',
  )
  if (!/aria-label=\{`\$\{item\.title\} — ドラッグで並び替え`\}/.test(subtasks)) {
    findings.push({
      level: 'warning',
      message: 'subtasks-panel.tsx: iter1698 drag handle literal-prefix が消えた',
    })
  }

  // 5. iter1697 backlog sortable header invariant
  const backlog = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )
  if (!/列でソート \(現在: /.test(backlog)) {
    findings.push({
      level: 'warning',
      message: 'backlog-view.tsx: iter1697 sortable header pattern が消えた',
    })
  }

  console.log(`\n=== Findings (workspace-header-actions-visible-prefix-iter1699) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
