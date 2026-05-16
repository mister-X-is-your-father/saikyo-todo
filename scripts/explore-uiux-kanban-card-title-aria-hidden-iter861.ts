/**
 * Phase 6.15 loop iter 861 (mode-D Desktop a11y) —
 * kanban-view の Card title button visible {item.title} を
 * <span aria-hidden="true"> で wrap し、aria-label 単独経路に統一。
 *
 * 経緯: iter844-860 sweep の続編。Kanban Card 内 title button (item open trigger)
 *   は aria-label "「{title}」を編集" が完全 content を含むのに visible {item.title} は
 *   aria-hidden 無し。SR は aria-label と visible を二重読み上げ。
 *   同じ行の 編集 ✎ icon button (aria-hidden 済) と統一。
 *
 * 修正: visible {item.title} を <span aria-hidden="true"> で wrap、aria-label 単独経路に統一。
 *   line-through (doneAt) / break-words / hover:underline / iter331/506 a11y 維持。
 *
 * 検証: source-side regex assert + iter735/843/849-860 invariant cross-check。
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

  // 1. visible {item.title} を span aria-hidden で wrap
  if (/<span aria-hidden="true">\{item\.title\}<\/span>/.test(kv)) {
    findings.push({
      level: 'info',
      message: `kanban-view title button visible {item.title} aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `kanban-view title button visible aria-hidden 未統合`,
    })
  }

  // 2. aria-label 完全 content 維持 (両 button 同 aria-label)
  const titleAriaLabels = (kv.match(/aria-label=\{`「\$\{item\.title\}」を編集`\}/g) ?? []).length
  if (titleAriaLabels >= 2) {
    findings.push({
      level: 'info',
      message: `kanban-view title + edit button aria-label 完全 content (2 箇所) 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `kanban-view aria-label 不足 (現在 ${titleAriaLabels} 箇所)`,
    })
  }

  // 3. 編集 ✎ icon aria-hidden 維持 (iter331)
  if (/<span aria-hidden="true">✎<\/span>/.test(kv)) {
    findings.push({
      level: 'info',
      message: `kanban-view edit ✎ icon aria-hidden 維持 OK (iter331)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `kanban-view edit ✎ icon aria-hidden 破壊`,
    })
  }

  // 4. data-testid + iter506 tap target pseudo + line-through 維持
  if (
    /data-testid=\{`kanban-title-\$\{item\.id\}`\}/.test(kv) &&
    /data-testid=\{`kanban-edit-\$\{item\.id\}`\}/.test(kv) &&
    /before:-inset-3/.test(kv) &&
    /text-muted-foreground line-through/.test(kv)
  ) {
    findings.push({
      level: 'info',
      message: `kanban-view data-testid + tap target + line-through 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `kanban-view a11y attrs / styling 破壊`,
    })
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

  // iter859 invariant
  const tp = readFileSync(
    resolve(process.cwd(), 'src/components/template/templates-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">作成<\/span>/.test(tp)) {
    findings.push({
      level: 'info',
      message: `iter859 invariant: templates-panel create-submit aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter859 invariant: 破壊` })
  }

  // iter857 invariant
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">期間<\/span>/.test(sp) &&
    /<span aria-hidden="true">稼働開始<\/span>/.test(sp)
  ) {
    findings.push({
      level: 'info',
      message: `iter857 invariant: sprints-panel sprint action aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter857 invariant: 破壊` })
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

  console.log(`\n=== Findings (kanban-card-title-aria-hidden-iter861) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
