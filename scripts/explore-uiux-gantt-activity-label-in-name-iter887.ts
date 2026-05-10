/**
 * Phase 6.15 loop iter 887 (mode-D Desktop a11y) —
 * gantt-view gantt-jump-today + activity-log activity-detail-toggle button:
 * WCAG 2.5.3 (Label in Name) 違反を一括修正 + visible aria-hidden 統合。
 *
 * 課題:
 *   - gantt-view (visible "今日へジャンプ") 旧 aria-label "Gantt timeline を今日 (...) の縦線まで横スクロール" は visible "今日へジャンプ" の "へジャンプ" 部分を含まず substring 不適合 → 音声「今日へジャンプ」 hit せず WCAG 2.5.3 違反
 *   - activity-log (visible "詳細を閉じる"/"詳細を見る") 旧 aria-label "「${label}」の差分 (before / after) を閉じる/見る" は visible "詳細" を含まず → 音声「詳細を見る」 hit せず WCAG 2.5.3 違反
 *
 * fix (2 ファイル / +5-3 行差分、2 button 一括):
 *   - gantt-view: aria-label を `今日へジャンプ (Gantt timeline を ${date} の縦線まで横スクロール)` 形に変更し visible prefix 適合化、span aria-hidden で wrap
 *   - activity-log: aria-label を `詳細を閉じる/詳細を見る (「${label}」の差分 before / after を閉じる/表示)` 形に変更し visible prefix 適合化、span aria-hidden で wrap
 *
 * 検証: source-side regex assert + iter885/886 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')
  const al = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/activity-log.tsx'),
    'utf8',
  )

  // 1. gantt-jump-today aria-label に "今日へジャンプ" prefix
  if (
    /aria-label=\{`今日へジャンプ \(Gantt timeline を \$\{format\(new Date\(\), 'M月d日 \(eee\)'\)\} の縦線まで横スクロール\)`\}/.test(
      gv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `gantt-jump-today aria-label に "今日へジャンプ" prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `gantt-jump-today aria-label が "今日へジャンプ" prefix 不含`,
    })
  }

  // 2. gantt-jump-today visible aria-hidden
  if (
    /data-testid="gantt-jump-today"[\s\S]+?<span aria-hidden="true">今日へジャンプ<\/span>/.test(gv)
  ) {
    findings.push({
      level: 'info',
      message: `gantt-jump-today visible "今日へジャンプ" span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `gantt-jump-today visible aria-hidden 未統合`,
    })
  }

  // 3. activity-detail-toggle aria-label に "詳細を見る/閉じる" prefix
  if (
    /aria-label=\{[\s\S]+?`詳細を閉じる \(「\$\{label\}」の差分 before \/ after を閉じる\)`[\s\S]+?`詳細を見る \(「\$\{label\}」の差分 before \/ after を表示\)`/.test(
      al,
    )
  ) {
    findings.push({
      level: 'info',
      message: `activity-detail-toggle aria-label に "詳細" prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `activity-detail-toggle aria-label が "詳細" prefix 不含`,
    })
  }

  // 4. activity-detail-toggle visible aria-hidden
  if (/<span aria-hidden="true">\{open \? '詳細を閉じる' : '詳細を見る'\}<\/span>/.test(al)) {
    findings.push({
      level: 'info',
      message: `activity-detail-toggle visible 切替 span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `activity-detail-toggle visible aria-hidden 未統合`,
    })
  }

  // iter886 invariant: dep-add-btn
  const dp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-dependencies-panel.tsx'),
    'utf8',
  )
  if (
    /data-testid="dep-add-btn"[\s\S]+?<span aria-hidden="true">\{add\.isPending \? '追加中…' : '追加'\}<\/span>/.test(
      dp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter886 invariant: dep-add-btn aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter886 invariant: dep-add-btn 破壊` })
  }

  // iter885 invariant: start-timer
  const st = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/start-timer-button.tsx'),
    'utf8',
  )
  if (/`計測開始 \(「\$\{item\.title\}」のタイマー開始\)`/.test(st)) {
    findings.push({
      level: 'info',
      message: `iter885 invariant: start-timer aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter885 invariant: start-timer 破壊` })
  }

  console.log(`\n=== Findings (gantt-activity-label-in-name-iter887) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
