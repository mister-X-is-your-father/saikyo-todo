/**
 * Phase 6.15 loop iter 691 (mode-D Desktop a11y) —
 * items-board board-empty-quick-add button に aria-keyshortcuts="q" 追加
 * (今日 / Inbox empty CTA と統一、SR / voice control に shortcut expose)。
 *
 * 課題: items-board.tsx 行 432 の board-empty-quick-add button は aria-label に
 *   「q キーでも可」 と書いてあるが `aria-keyshortcuts="q"` が無い。
 *   today-empty-quick-add (today-view.tsx) と inbox-empty-quick-add (inbox-view.tsx) は
 *   既に `aria-keyshortcuts="q"` を持つので統一すべき。
 *   aria-keyshortcuts は SR / voice control が key shortcut を programmatically expose 可能。
 *
 * fix (1 ファイル ~1 行差分):
 *   - board-empty-quick-add に `aria-keyshortcuts="q"` 追加
 *
 * 検証: source-side regex assert + iter515-690 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )

  // 1. board-empty-quick-add に aria-keyshortcuts
  if (
    /data-testid="board-empty-quick-add"\s*\n\s*aria-keyshortcuts="q"\s*\n\s*aria-label="クイック追加入力欄にフォーカス \(q キーでも可\)"/.test(
      ib,
    )
  ) {
    findings.push({ level: 'info', message: `board-empty-quick-add aria-keyshortcuts OK` })
  } else {
    findings.push({ level: 'warning', message: `board-empty-quick-add aria-keyshortcuts なし` })
  }

  // 2. today-empty-quick-add 既存 aria-keyshortcuts 維持
  const tv = readFileSync(resolve(process.cwd(), 'src/components/workspace/today-view.tsx'), 'utf8')
  if (
    /data-testid="today-empty-quick-add"\s*\n\s*aria-label="クイック追加入力欄にフォーカス \(q キーでも可\)"\s*\n\s*aria-keyshortcuts="q"/.test(
      tv,
    )
  ) {
    findings.push({ level: 'info', message: `today-empty-quick-add aria-keyshortcuts 既存維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `today-empty-quick-add aria-keyshortcuts 破壊` })
  }

  // 3. inbox-empty-quick-add 既存 aria-keyshortcuts 維持
  const iv = readFileSync(resolve(process.cwd(), 'src/components/workspace/inbox-view.tsx'), 'utf8')
  if (/data-testid="inbox-empty-quick-add"\s*\n\s*aria-keyshortcuts="q"/.test(iv)) {
    findings.push({ level: 'info', message: `inbox-empty-quick-add aria-keyshortcuts 既存維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `inbox-empty-quick-add aria-keyshortcuts 破壊` })
  }

  // 4. iter690 invariant: kanban empty 維持
  const kv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/kanban-view.tsx'),
    'utf8',
  )
  if (
    /<div\s*\n\s*className="text-muted-foreground rounded border border-dashed px-2 py-4 text-center text-xs"\s*\n\s*role="status"\s*\n\s*aria-live="polite"/.test(
      kv,
    )
  ) {
    findings.push({ level: 'info', message: `iter690 invariant: kanban empty 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter690 invariant: 破壊` })
  }

  // 5. iter689 invariant: bulk-count 維持
  const bb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/bulk-action-bar.tsx'),
    'utf8',
  )
  if (
    /<span\s*\n\s*className="text-sm font-medium"\s*\n\s*role="status"\s*\n\s*aria-live="polite"\s*\n\s*aria-atomic="true"\s*\n\s*data-testid="bulk-count"/.test(
      bb,
    )
  ) {
    findings.push({ level: 'info', message: `iter689 invariant: bulk-count 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter689 invariant: 破壊` })
  }

  console.log(`\n=== Findings (board-empty-keyshortcuts-iter691) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
