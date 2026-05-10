/**
 * Phase 6.15 loop iter 891 (mode-D Desktop a11y) —
 * backlog-edit-{id} button + sprint-swimlane-summary <summary> の visible
 * aria-hidden 統合 + sprint-swimlane-summary は WCAG 2.5.3 (Label in Name) 適合化。
 *
 * 課題:
 *   - src/components/workspace/backlog-view.tsx backlog-edit-{id} (visible "編集") aria-label
 *     "「{title}」を編集" 適合だったが iter844-890 campaign 規約から外れていた
 *   - src/components/workspace/sprint-swimlane-disclosure.tsx sprint-swimlane-summary <summary>
 *     (visible "担当者ビュー (swim-lane Gantt)") 旧 aria-label "Sprint「{name}」の担当者 swim-lane Gantt を開く/閉じる" は visible "担当者ビュー" と "担当者 swim-lane" の間で乖離
 *     ("ビュー" 不含) → WCAG 2.5.3 違反
 *
 * fix (2 ファイル / +3-3 行差分、2 element 一括):
 *   - backlog-edit: <Button>編集</Button> → <Button><span aria-hidden="true">編集</span></Button>
 *   - swimlane summary aria-label を `担当者ビュー (swim-lane Gantt) を開く/閉じる (Sprint「${name}」)` 形に変更し visible prefix 適合化、span aria-hidden で wrap
 *
 * 検証: source-side regex assert + iter889/890 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const bl = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )
  const sw = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprint-swimlane-disclosure.tsx'),
    'utf8',
  )

  // 1. backlog-edit visible "編集" aria-hidden
  if (
    /data-testid=\{`backlog-edit-\$\{row\.original\.id\}`\}[\s\S]+?<span aria-hidden="true">編集<\/span>/.test(
      bl,
    )
  ) {
    findings.push({
      level: 'info',
      message: `backlog-edit visible "編集" span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `backlog-edit visible aria-hidden 未統合`,
    })
  }

  // 2. swimlane summary aria-label に "担当者ビュー (swim-lane Gantt)" prefix
  if (
    /`担当者ビュー \(swim-lane Gantt\) を閉じる \(Sprint「\$\{sprintName\}」\)`[\s\S]+?`担当者ビュー \(swim-lane Gantt\) を開く \(Sprint「\$\{sprintName\}」\)`/.test(
      sw,
    )
  ) {
    findings.push({
      level: 'info',
      message: `swimlane summary aria-label に "担当者ビュー (swim-lane Gantt)" prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `swimlane summary aria-label が "担当者ビュー" prefix 不含`,
    })
  }

  // 3. swimlane visible aria-hidden
  if (/<span aria-hidden="true">担当者ビュー \(swim-lane Gantt\)<\/span>/.test(sw)) {
    findings.push({
      level: 'info',
      message: `swimlane summary visible "担当者ビュー (swim-lane Gantt)" span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `swimlane summary visible aria-hidden 未統合`,
    })
  }

  // 4. 旧 swimlane aria-label "Sprint「..」の担当者 swim-lane Gantt を開く" 削除
  if (!/`Sprint「\$\{sprintName\}」の担当者 swim-lane Gantt を開く`/.test(sw)) {
    findings.push({
      level: 'info',
      message: `swimlane summary 旧 aria-label 削除済 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `swimlane summary 旧 aria-label 残存` })
  }

  // iter890 invariant: root logout-btn aria-hidden
  const root = readFileSync(resolve(process.cwd(), 'src/app/page.tsx'), 'utf8')
  if (/data-testid="logout-btn"[\s\S]+?<span aria-hidden="true">ログアウト<\/span>/.test(root)) {
    findings.push({
      level: 'info',
      message: `iter890 invariant: root logout-btn aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter890 invariant: root logout-btn 破壊` })
  }

  console.log(`\n=== Findings (backlog-edit-swimlane-summary-iter891) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
