/**
 * Phase 6.15 loop iter 865 (mode-D Desktop a11y) —
 * kanban-view / taskchute-view / personal-period-view item title button 内 visible
 * {item.title} / {it.title} を aria-hidden span で wrap (3 callsite).
 *
 * 課題: 3 view file の item title button:
 *   - kanban-view.tsx 行 324-339: button に aria-label "「{title}」を編集" あり、内側 visible {item.title} は aria-hidden 無し
 *   - taskchute-view.tsx 行 169-176: 同 pattern
 *   - personal-period-view.tsx 行 230-241: 同 pattern
 * いずれも親 button に aria-label が完全 content を含むのに、内側 visible は aria-hidden 無し →
 * 一部 SR で重複読み上げ risk + sweep の defensive 統一観点で wrap 推奨。
 * iter844-864 sweep の続編で 3 callsite 一括対応、Kanban / TaskChute / Personal Period view 主要
 * row 操作の SR 経路整合性向上。これで主要 7 view (Inbox / Today / Backlog / Kanban / TaskChute /
 * Personal Period / Archive) の title button visible は全て aria-hidden 統一に近づいた。
 *
 * fix (3 file 各 ~1 行):
 *   - kanban-view title button 内 {item.title} を <span aria-hidden="true"> で wrap
 *   - taskchute-view title button 内 {item.title} を <span aria-hidden="true"> で wrap
 *   - personal-period-view title button 内 {it.title} を <span aria-hidden="true"> で wrap
 *   - 既存 aria-label / data-testid / MustBadge / StatusBadge / 日付 期限時刻 維持
 *
 * 検証: source-side regex assert + iter735-864 invariant cross-check。
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
  const tcv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/taskchute-view.tsx'),
    'utf8',
  )
  const ppv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/personal-period-view.tsx'),
    'utf8',
  )

  // 1. kanban title button 内 {item.title} aria-hidden span
  if (/<span aria-hidden="true">\{item\.title\}<\/span>/.test(kv)) {
    findings.push({
      level: 'info',
      message: `kanban-view title visible {item.title} aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `kanban-view title visible aria-hidden 未統合`,
    })
  }

  // 2. taskchute title button 内 {item.title} aria-hidden span
  if (/<span aria-hidden="true">\{item\.title\}<\/span>/.test(tcv)) {
    findings.push({
      level: 'info',
      message: `taskchute-view title visible {item.title} aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `taskchute-view title visible aria-hidden 未統合`,
    })
  }

  // 3. personal-period-view title button 内 {it.title} aria-hidden span
  if (/<span aria-hidden="true">\{it\.title\}<\/span>/.test(ppv)) {
    findings.push({
      level: 'info',
      message: `personal-period-view title visible {it.title} aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `personal-period-view title visible aria-hidden 未統合`,
    })
  }

  // 4. 各 view の aria-label 維持
  const ariaLabels = [
    /aria-label=\{`「\$\{item\.title\}」を編集`\}/.test(kv),
    /aria-label=\{`\$\{item\.title\} を編集`\}/.test(tcv),
    /aria-label=\{`「\$\{it\.title\}」を編集`\}/.test(ppv),
  ]
  if (ariaLabels.every(Boolean)) {
    findings.push({
      level: 'info',
      message: `3 view aria-label (kanban / taskchute / personal-period) 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `aria-label regression (${ariaLabels.filter(Boolean).length}/3)`,
    })
  }

  // 5. iter864 invariant: inbox-view title + backlog-view title / edit aria-hidden
  const iv = readFileSync(resolve(process.cwd(), 'src/components/workspace/inbox-view.tsx'), 'utf8')
  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )
  if (
    /data-testid=\{`inbox-title-\$\{it\.id\}`\}\n\s+aria-hidden="true"/.test(iv) &&
    /<span aria-hidden="true">\{String\(getValue\(\)\)\}<\/span>/.test(bv) &&
    /<span aria-hidden="true">編集<\/span>/.test(bv)
  ) {
    findings.push({
      level: 'info',
      message: `iter864 invariant: inbox + backlog title/edit aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter864 invariant: 破壊` })
  }

  // 6. iter735 invariant: team-context-editor aria-keyshortcuts
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

  console.log(`\n=== Findings (kanban-taskchute-period-title-aria-hidden-iter865) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
