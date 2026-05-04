/**
 * Phase 6.15 loop iter 735 (mode-D Desktop a11y) —
 * team-context-editor の Textarea に aria-keyshortcuts を追加 (Cmd/Ctrl+Enter
 * 保存ショートカットを SR で discoverable にする)。
 *
 * 課題: team-context-editor.tsx 行 61-90 の Textarea は onKeyDown で Cmd/Ctrl+Enter を
 *   trap して保存するが、aria-keyshortcuts attribute が無い。同 component の Save button
 *   (行 103) には `aria-keyshortcuts="Meta+Enter Control+Enter"` がついていて SR で
 *   discoverable だが、実際にショートカットを撃つ focus target である Textarea 自体には
 *   未付与。SR ユーザは Textarea focus 中に shortcut を知る術がない (aria-label に文章で
 *   含まれているが aria-keyshortcuts は別の dedicated channel)。
 *
 * fix (1 ファイル ~1 行差分):
 *   - Textarea に `aria-keyshortcuts="Meta+Enter Control+Enter"` を追加
 *
 * 検証: source-side regex assert + iter720-734 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )

  // 1. Textarea に aria-keyshortcuts="Meta+Enter Control+Enter" 追加
  // 該当 Textarea 直下に aria-keyshortcuts が登場すること (Save button のと別に存在)
  const matches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (matches.length >= 2) {
    findings.push({
      level: 'info',
      message: `team-context-editor aria-keyshortcuts 追加 OK (${matches.length} 箇所、Textarea + Save button)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `team-context-editor aria-keyshortcuts 追加 不完全 (${matches.length} 箇所のみ)`,
    })
  }

  // 2. iter733 race invariant: create-workspace slug-hint 維持
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

  // 3. iter728 invariant: taskchute-view ol 件数動的化維持
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

  // 4. iter727 invariant: ItemList ariaLabel prop 維持
  const ob = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )
  if (/ariaLabel\?:\s*string/.test(ob)) {
    findings.push({ level: 'info', message: `iter727 invariant: ItemList ariaLabel prop 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter727 invariant: 破壊` })
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

  console.log(`\n=== Findings (team-context-keyshortcuts-iter735) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
