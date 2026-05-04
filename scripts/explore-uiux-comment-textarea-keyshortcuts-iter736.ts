/**
 * Phase 6.15 loop iter 736 (mode-D Desktop a11y) —
 * comment-thread の Textarea に aria-keyshortcuts を追加 (iter735 sweep の続き、
 * Cmd/Ctrl+Enter 投稿ショートカットを SR で discoverable にする)。
 *
 * 課題: comment-thread.tsx 行 84-112 の Textarea (コメント本文入力) は onKeyDown で
 *   Cmd/Ctrl+Enter trap して投稿するが、aria-keyshortcuts attribute 無し。
 *   同 component の Post button (iter356 で aria-keyshortcuts 付与済) と非対称で、
 *   実際にショートカットを撃つ focus target である Textarea 自体には未付与。
 *   コメントは Item edit dialog 内で頻出する UI なので、SR ユーザの体験改善 impact
 *   が大きい (今 iter735 の team-context-editor と同じ修正 pattern を波及)。
 *
 * fix (1 ファイル ~1 行差分):
 *   - Textarea に `aria-keyshortcuts="Meta+Enter Control+Enter"` を追加
 *
 * 検証: source-side regex assert + iter720-735 invariant cross-check。
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

  // 1. Textarea + Post button 両方に aria-keyshortcuts="Meta+Enter Control+Enter" あり
  const matches = ct.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (matches.length >= 2) {
    findings.push({
      level: 'info',
      message: `comment-thread aria-keyshortcuts 追加 OK (${matches.length} 箇所、Textarea + Post button 等)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `comment-thread aria-keyshortcuts 不完全 (${matches.length} 箇所のみ)`,
    })
  }

  // 2. iter735 invariant: team-context-editor Textarea aria-keyshortcuts 維持
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

  // 3. iter733 race invariant: create-workspace slug-hint 維持
  const cwf = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/create-workspace-form.tsx'),
    'utf8',
  )
  if (
    /<p id="ws-slug-hint" className="text-muted-foreground text-xs">\s*\n?\s*小文字 \(a-z\) \/ 数字 \/ ハイフンのみ。最大 50 文字。例: team-a\s*\n?\s*<\/p>/.test(
      cwf,
    )
  ) {
    findings.push({ level: 'info', message: `iter733-race invariant: slug-hint paragraph 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter733-race invariant: 破壊` })
  }

  // 4. iter728 invariant: taskchute-view ol 件数動的化維持
  const tc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/taskchute-view.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`今日の task を時刻昇順で並べた 1 列 timeline \$\{ordered\.length\} 件`\}/.test(
      tc,
    )
  ) {
    findings.push({ level: 'info', message: `iter728 invariant: taskchute-view ol 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter728 invariant: 破壊` })
  }

  // 5. iter720 invariant: cycle-check status dl 維持
  const ccs = readFileSync(
    resolve(process.cwd(), 'src/components/pdca/cycle-check-stats-card.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`ステータス分布 \(完了 \$\{stats\.done\} 件 \/ 未完了 \$\{stats\.inProgressOrTodo\} 件 \/ cancelled \$\{stats\.cancelled\} 件\)`\}/.test(
      ccs,
    )
  ) {
    findings.push({ level: 'info', message: `iter720 invariant: cycle-check status 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter720 invariant: 破壊` })
  }

  console.log(`\n=== Findings (comment-textarea-keyshortcuts-iter736) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
