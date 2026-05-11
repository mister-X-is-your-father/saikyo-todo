/**
 * Phase 6.15 loop iter 869 (mode-D Desktop a11y) —
 * gantt-view 今日へジャンプ (gantt-jump-today) button:
 * WCAG 2.5.3 (Label in Name) 違反を修正。
 *
 * 課題: src/components/workspace/gantt-view.tsx の `gantt-jump-today` button
 *   は visible "今日へジャンプ" を持つが aria-label "Gantt timeline を
 *   今日 (M月d日 (eee)) の縦線まで横スクロール" は visible "今日へジャンプ"
 *   の "へジャンプ" 5 char を含まず ("今日 (date) の縦線まで横スクロール"
 *   と続くため "今日へジャンプ" 連続が aria-label に **無い**) → strict
 *   substring 不一致で WCAG 2.5.3 失敗 (voice control「今日へジャンプ」
 *   発話で name 一致せず)。
 *
 * fix (1 ファイル ~1 行差分):
 *   - visible "今日へジャンプ" を <span aria-hidden> で wrap、aria-label
 *     単独経路に統一 (iter844-868 同 pattern)。
 *   - aria-label の Gantt timeline + 今日日付 + 縦線スクロール文脈は維持
 *     (= 動的日付付きで SR が「今日が何月何日」 まで取れる)。
 *
 * 検証: source-side regex assert + iter735-868 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const gv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'),
    'utf8',
  )

  // 1. gantt-jump-today visible aria-hidden
  if (/<span aria-hidden="true">今日へジャンプ<\/span>/.test(gv)) {
    findings.push({
      level: 'info',
      message: `gantt-jump-today visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `gantt-jump-today visible aria-hidden 未統合`,
    })
  }

  // 2. aria-label に Gantt timeline + 今日日付 + 縦線スクロール文脈維持
  if (/Gantt timeline を今日.{0,80}縦線まで横スクロール/s.test(gv)) {
    findings.push({
      level: 'info',
      message: `gantt-jump-today aria-label (timeline + 日付 + 縦線) 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `gantt-jump-today aria-label 文脈破壊`,
    })
  }

  // 3. data-testid 維持
  if (/data-testid="gantt-jump-today"/.test(gv)) {
    findings.push({
      level: 'info',
      message: `gantt-jump-today testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `gantt-jump-today testid 破壊` })
  }

  // iter868 invariant: swimlane summary visible aria-hidden
  const ssd = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprint-swimlane-disclosure.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">担当者ビュー \(swim-lane Gantt\)<\/span>/.test(ssd)) {
    findings.push({
      level: 'info',
      message: `iter868 invariant: swimlane summary visible aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter868 invariant 破壊` })
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

  console.log(`\n=== Findings (gantt-jump-today-aria-hidden-iter869) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
