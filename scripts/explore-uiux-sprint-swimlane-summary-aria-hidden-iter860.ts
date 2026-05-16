/**
 * Phase 6.15 loop iter 860 (mode-D Desktop a11y) —
 * sprint-swimlane-disclosure の <summary> visible "担当者ビュー (swim-lane Gantt)" を
 * <span aria-hidden="true"> で wrap し、aria-label 単独経路に統一。
 *
 * 経緯: iter844-859 sweep の続編。<details>/<summary> は SR が「details, ボタン」 等の
 *   semantic role を読み上げるが、aria-label が完全 content (open / closed 2 状態)
 *   を含むのに visible "担当者ビュー (swim-lane Gantt)" は aria-hidden 無し → 二重読み上げ。
 *
 * 修正: visible text を <span aria-hidden="true"> で wrap、aria-label 単独経路に統一。
 *   icon (Users) は既に aria-hidden、これで統一。<summary> 自体の semantic 維持。
 *
 * 検証: source-side regex assert + iter735/843/849-859 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ssd = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprint-swimlane-disclosure.tsx'),
    'utf8',
  )

  // 1. visible "担当者ビュー (swim-lane Gantt)" を span aria-hidden で wrap
  if (/<span aria-hidden="true">担当者ビュー \(swim-lane Gantt\)<\/span>/.test(ssd)) {
    findings.push({
      level: 'info',
      message: `sprint-swimlane summary visible "担当者ビュー" aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-swimlane summary visible aria-hidden 未統合`,
    })
  }

  // 2. aria-label 完全 content 維持 (open / closed 2 状態)
  if (
    /aria-label=\{[\s\S]+?`Sprint「\$\{sprintName\}」の担当者 swim-lane Gantt を閉じる`/.test(
      ssd,
    ) &&
    /aria-label=\{[\s\S]+?`Sprint「\$\{sprintName\}」の担当者 swim-lane Gantt を開く`/.test(ssd)
  ) {
    findings.push({
      level: 'info',
      message: `sprint-swimlane summary aria-label 2 状態 完全 content 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-swimlane summary aria-label 破壊`,
    })
  }

  // 3. <details> / data-testid + Users icon aria-hidden 維持
  if (
    /<details[\s\S]+?data-testid=\{`sprint-swimlane-\$\{sprintId\}`\}/.test(ssd) &&
    /data-testid=\{`sprint-swimlane-summary-\$\{sprintId\}`\}/.test(ssd) &&
    /<Users className="h-3\.5 w-3\.5" aria-hidden="true" \/>/.test(ssd)
  ) {
    findings.push({
      level: 'info',
      message: `sprint-swimlane <details> 構造 + Users icon aria-hidden 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-swimlane <details> / icon attrs 破壊`,
    })
  }

  // iter859 invariant: templates-panel create button aria-hidden
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

  // iter858 invariant
  const dpp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">中止<\/span>/.test(dpp)) {
    findings.push({
      level: 'info',
      message: `iter858 invariant: decompose-proposals-panel agent-cancel aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter858 invariant: 破壊` })
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

  console.log(`\n=== Findings (sprint-swimlane-summary-aria-hidden-iter860) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
