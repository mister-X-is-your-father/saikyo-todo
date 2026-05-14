/**
 * Phase 6.15 loop iter 864 (mode-D Desktop a11y) —
 * inbox-view title span + backlog-view title button + backlog edit button visible を
 * aria-hidden span で wrap (3 callsite).
 *
 * 課題: 3 spot:
 *   - inbox-view.tsx 行 193-195: 親 row div に aria-label "{title} を編集ダイアログで開く" あり、
 *     内側 <span> {it.title} は aria-hidden 無し
 *   - backlog-view.tsx 行 117-119: title button に aria-label 「{title}」を編集 あり、内側 visible 同
 *   - backlog-view.tsx 行 174-186: edit button に aria-label 「{title}」を編集 あり、visible "編集" は
 *     button name 短すぎ + visible 重複の defensive wrap
 * iter844-863 sweep の続編で 3 callsite 一括対応、Inbox / Backlog 主要 row 操作の SR 経路整合性向上。
 *
 * fix (2 file ~3 行差分、3 callsite):
 *   - inbox-view title <span> に aria-hidden="true" 追加
 *   - backlog title button 内 {String(getValue())} を <span aria-hidden="true"> で wrap
 *   - backlog edit button 内 "編集" を <span aria-hidden="true"> で wrap
 *   - 既存 aria-label / data-testid / button 機能維持
 *
 * 検証: source-side regex assert + iter735-863 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const iv = readFileSync(resolve(process.cwd(), 'src/components/workspace/inbox-view.tsx'), 'utf8')
  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )

  // 1. inbox-view title <span> に aria-hidden="true"
  if (/data-testid=\{`inbox-title-\$\{it\.id\}`\}\n\s+aria-hidden="true"/.test(iv)) {
    findings.push({
      level: 'info',
      message: `inbox-view title visible <span> aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `inbox-view title visible aria-hidden 未統合`,
    })
  }

  // 2. backlog title button 内 visible {String(getValue())} aria-hidden span
  if (/<span aria-hidden="true">\{String\(getValue\(\)\)\}<\/span>/.test(bv)) {
    findings.push({
      level: 'info',
      message: `backlog-view title button visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `backlog-view title button visible aria-hidden 未統合`,
    })
  }

  // 3. backlog edit button "編集" aria-hidden span
  if (/<span aria-hidden="true">編集<\/span>/.test(bv)) {
    findings.push({
      level: 'info',
      message: `backlog-view edit button visible "編集" aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `backlog-view edit button visible aria-hidden 未統合`,
    })
  }

  // 4. aria-label 維持
  const ariaInbox = /aria-label=\{`\$\{it\.title\} を編集ダイアログで開く`\}/.test(iv)
  const ariaBacklogTitle = /aria-label=\{`「\$\{String\(getValue\(\)\)\}」を編集`\}/.test(bv)
  const ariaBacklogEdit = /aria-label=\{`「\$\{row\.original\.title\}」を編集`\}/.test(bv)
  if (ariaInbox && ariaBacklogTitle && ariaBacklogEdit) {
    findings.push({
      level: 'info',
      message: `3 aria-label (inbox row + backlog title + backlog edit) 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `aria-label regression (inbox=${ariaInbox} backlogTitle=${ariaBacklogTitle} backlogEdit=${ariaBacklogEdit})`,
    })
  }

  // 5. iter863 invariant: archive + today title aria-hidden
  const aip = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/archived-items-panel.tsx'),
    'utf8',
  )
  const tv = readFileSync(resolve(process.cwd(), 'src/components/workspace/today-view.tsx'), 'utf8')
  if (
    /<span aria-hidden="true">\{item\.title\}<\/span>/.test(aip) &&
    /<span aria-hidden="true">\{it\.title\}<\/span>/.test(tv)
  ) {
    findings.push({
      level: 'info',
      message: `iter863 invariant: archive + today title aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter863 invariant: 破壊` })
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

  console.log(`\n=== Findings (inbox-backlog-title-aria-hidden-iter864) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
