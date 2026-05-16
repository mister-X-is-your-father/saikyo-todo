/**
 * Phase 6.15 loop iter 862 (mode-D Desktop a11y) —
 * today-view + backlog-view の Item title button + 編集 button visible text を
 * <span aria-hidden="true"> で wrap し、aria-label 単独経路に統一。
 *
 * 経緯: iter861 で kanban-view title button に同 pattern 適用済 → today-view +
 *   backlog-view にも展開 (3 view 横断統一)。
 *   3 箇所:
 *     1. today-view title button visible {it.title}
 *     2. backlog-view title cell button visible {String(getValue())}
 *     3. backlog-view 編集 button visible "編集"
 *   いずれも aria-label "「{title}」を編集" が完全 content を含む。
 *
 * 修正: 3 箇所一括で visible text を <span aria-hidden="true"> で wrap、
 *   aria-label 単独経路に統一。Today/Backlog 共通の編集 entry 規約一致。
 *
 * 検証: source-side regex assert + iter735/843/849-861 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tv = readFileSync(resolve(process.cwd(), 'src/components/workspace/today-view.tsx'), 'utf8')
  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )

  // 1. today-view title button visible {it.title} aria-hidden
  if (/<span aria-hidden="true">\{it\.title\}<\/span>/.test(tv)) {
    findings.push({
      level: 'info',
      message: `today-view title button visible {it.title} aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `today-view title button visible aria-hidden 未統合`,
    })
  }

  // 2. today-view title button aria-label 維持
  if (/aria-label=\{`「\$\{it\.title\}」を編集`\}/.test(tv)) {
    findings.push({
      level: 'info',
      message: `today-view title button aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `today-view title button aria-label 破壊`,
    })
  }

  // 3. backlog-view title cell button visible getValue() aria-hidden
  if (/<span aria-hidden="true">\{String\(getValue\(\)\)\}<\/span>/.test(bv)) {
    findings.push({
      level: 'info',
      message: `backlog-view title cell visible {getValue()} aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `backlog-view title cell visible aria-hidden 未統合`,
    })
  }

  // 4. backlog-view 編集 button visible "編集" aria-hidden
  if (/<span aria-hidden="true">編集<\/span>/.test(bv)) {
    findings.push({
      level: 'info',
      message: `backlog-view edit button visible "編集" aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `backlog-view edit button visible aria-hidden 未統合`,
    })
  }

  // 5. backlog-view 2 button aria-label 完全 content 維持
  if (
    /aria-label=\{`「\$\{String\(getValue\(\)\)\}」を編集`\}/.test(bv) &&
    /aria-label=\{`「\$\{row\.original\.title\}」を編集`\}/.test(bv)
  ) {
    findings.push({
      level: 'info',
      message: `backlog-view title + edit button aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `backlog-view aria-label 破壊`,
    })
  }

  // 6. data-testid 維持
  if (
    /data-testid=\{`today-title-\$\{it\.id\}`\}/.test(tv) &&
    /data-testid=\{`backlog-title-\$\{row\.original\.id\}`\}/.test(bv) &&
    /data-testid=\{`backlog-edit-\$\{row\.original\.id\}`\}/.test(bv)
  ) {
    findings.push({
      level: 'info',
      message: `today + backlog title/edit button data-testid 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `data-testid 破壊`,
    })
  }

  // iter861 invariant: kanban-view title button aria-hidden
  const kv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/kanban-view.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{item\.title\}<\/span>/.test(kv)) {
    findings.push({
      level: 'info',
      message: `iter861 invariant: kanban-view title button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter861 invariant: 破壊` })
  }

  // iter860 invariant
  const ssd = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprint-swimlane-disclosure.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">担当者ビュー \(swim-lane Gantt\)<\/span>/.test(ssd)) {
    findings.push({
      level: 'info',
      message: `iter860 invariant: sprint-swimlane summary aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter860 invariant: 破壊` })
  }

  // iter735 invariant
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

  console.log(`\n=== Findings (list-view-title-edit-aria-hidden-iter862) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
