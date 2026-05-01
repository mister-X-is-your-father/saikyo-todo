/**
 * Phase 6.15 loop iter 562 (mode-D Desktop a11y) —
 * KanbanCard title button に aria-label を補完。
 *
 * 課題: kanban-view.tsx 行 320-334 の title button (= edit dialog open trigger) は
 *   data-testid のみで aria-label が無い。同 card 内の sibling button (✎ icon edit
 *   button、行 338+) は aria-label={`「${item.title}」を編集`} を持つが、title 文字
 *   button のみ漏れていた。
 *
 * fix (1 ファイル ~1 行差分):
 *   - aria-label={`「${item.title}」を編集`}
 *
 * iter331 / iter531 / iter532 / iter533 / iter534 title aria-label pattern を Kanban
 * title button に統一 (これで Kanban 内 2 button + Backlog / Today / Inbox /
 * Dashboard MUST / Period の 6 view + 2 button = 8 ベクトル統一)。
 *
 * 検証: source-side regex assert + iter515-561 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const kv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/kanban-view.tsx'),
    'utf8',
  )

  // 1. kanban-title button aria-label
  if (
    /data-testid=\{`kanban-title-\$\{item\.id\}`\}\s+aria-label=\{`「\$\{item\.title\}」を編集`\}/.test(
      kv,
    ) ||
    /aria-label=\{`「\$\{item\.title\}」を編集`\}\s+data-testid=\{`kanban-title-\$\{item\.id\}`\}/.test(
      kv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `kanban-view.tsx: kanban-title button aria-label 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `kanban-view.tsx: kanban-title button aria-label 不在`,
    })
  }

  // 2. iter331 invariant: Kanban edit pen button aria-label 維持
  if (/aria-label=\{`「\$\{item\.title\}」を編集`\}/.test(kv)) {
    findings.push({
      level: 'info',
      message: `iter331 invariant: Kanban edit pen button aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter331 invariant: 破壊`,
    })
  }

  // 3. iter561 invariant: sprint-retro delta aria-label 維持
  const srw = readFileSync(
    resolve(process.cwd(), 'src/components/sprint/sprint-retro-widget.tsx'),
    'utf8',
  )
  if (/'納品 = 計画 \(差分なし\)'/.test(srw) && /`納品 - 計画 \$\{delta\} 件 \(未達\)`/.test(srw)) {
    findings.push({
      level: 'info',
      message: `iter561 invariant: sprint-retro delta aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter561 invariant: 破壊`,
    })
  }

  // 4. iter515 anchor invariant
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (/aria-label=\{\s*importsOpen\s*\?\s*`Source「\$\{src\.name\}」の Pull 履歴/.test(ip)) {
    findings.push({
      level: 'info',
      message: `iter515 invariant: integrations-panel 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter515 invariant: 破壊`,
    })
  }

  console.log(`\n=== Findings (kanban-title-aria-iter562) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
