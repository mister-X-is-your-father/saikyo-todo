/**
 * Phase 6.15 loop iter 868 (mode-D Desktop a11y) —
 * sprint-swimlane-disclosure summary trigger:
 * WCAG 2.5.3 (Label in Name) 違反を修正。
 *
 * 課題: src/components/workspace/sprint-swimlane-disclosure.tsx の
 *   `sprint-swimlane-summary-{id}` <summary> trigger は visible
 *   "担当者ビュー (swim-lane Gantt)" を持つが aria-label
 *   "Sprint「name」の担当者 swim-lane Gantt を {開く|閉じる}" は
 *   visible vocab "担当者ビュー" の "ビュー" を含まず ("担当者 swim-lane"
 *   と続くため "担当者ビュー" の連続が aria-label に **無い**) → strict
 *   substring 不一致で WCAG 2.5.3 失敗 (voice control「担当者ビュー」発話で
 *   name 一致せず)。
 *
 * fix (1 ファイル ~1 行差分):
 *   - visible "担当者ビュー (swim-lane Gantt)" を <span aria-hidden> で wrap、
 *     aria-label 単独経路に統一 (iter844-867 同 pattern)。
 *   - aria-label の Sprint 名 + 開/閉 状態文脈は維持 (= details の
 *     open/closed が SR で読まれる)。
 *
 * 検証: source-side regex assert + iter735-867 invariant cross-check。
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

  // 1. swimlane summary visible aria-hidden
  if (
    /<span aria-hidden="true">担当者ビュー \(swim-lane Gantt\)<\/span>/.test(ssd)
  ) {
    findings.push({
      level: 'info',
      message: `swimlane summary visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `swimlane summary visible aria-hidden 未統合`,
    })
  }

  // 2. aria-label に Sprint 名 + 開/閉 状態維持 (open path)
  if (/`Sprint「\$\{sprintName\}」の担当者 swim-lane Gantt を閉じる`/.test(ssd)) {
    findings.push({
      level: 'info',
      message: `swimlane summary aria-label (open path) 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `swimlane summary aria-label (open path) 文脈破壊`,
    })
  }
  if (/`Sprint「\$\{sprintName\}」の担当者 swim-lane Gantt を開く`/.test(ssd)) {
    findings.push({
      level: 'info',
      message: `swimlane summary aria-label (closed path) 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `swimlane summary aria-label (closed path) 文脈破壊`,
    })
  }

  // 3. data-testid 維持
  if (/data-testid=\{`sprint-swimlane-summary-\$\{sprintId\}`\}/.test(ssd)) {
    findings.push({
      level: 'info',
      message: `swimlane summary testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `swimlane summary testid 破壊` })
  }

  // iter867 invariant: notification-mark-all-read visible aria-hidden
  const nb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/notification-bell.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">全て既読<\/span>/.test(nb)) {
    findings.push({
      level: 'info',
      message: `iter867 invariant: notification-mark-all-read aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter867 invariant 破壊` })
  }

  // iter866 invariant: proposals-redecompose visible aria-hidden
  const dpp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{list\.length > 0 \? '追加分解' : '再分解'\}<\/span>/.test(dpp)
  ) {
    findings.push({
      level: 'info',
      message: `iter866 invariant: proposals-redecompose aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter866 invariant 破壊` })
  }

  // iter735 invariant: team-context-editor aria-keyshortcuts
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

  console.log(`\n=== Findings (swimlane-summary-aria-hidden-iter868) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
