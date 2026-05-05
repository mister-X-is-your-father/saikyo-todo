/**
 * Phase 6.15 loop iter 799 (mode-D Desktop a11y) —
 * engineer-trigger-button group aria-label に item title 含めて item-specific 化。
 *
 * 課題: engineer-trigger-button.tsx 行 63 の group aria-label="Engineer Agent 起動
 *   (PR 自動起票 toggle / 実装起動)" は静的で、ItemEditDialog 内 (= 開いてる item
 *   に対して) 表示されるが、SR ユーザは group focus 時に「どの Item に Engineer を
 *   投入する操作か」 が分からなかった。component は `item: Item` prop を持つので
 *   item.title を埋め込み可能 (iter763 / iter764 / iter793 / iter794 page-specific
 *   naming sweep の続編)。
 *
 * fix (1 ファイル ~1 行差分):
 *   - aria-label を `「${item.title}」を Engineer Agent に投入 (PR 自動起票
 *     toggle / 実装起動)` に動的化
 *
 * 検証: source-side regex assert + iter735-798 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const etb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/engineer-trigger-button.tsx'),
    'utf8',
  )
  const hasDynamicLabel =
    /aria-label=\{`「\$\{item\.title\}」を Engineer Agent に投入 \(PR 自動起票 toggle \/ 実装起動\)`\}/.test(
      etb,
    )
  const oldStaticGone = !etb.includes(
    'aria-label="Engineer Agent 起動 (PR 自動起票 toggle / 実装起動)"',
  )
  if (hasDynamicLabel && oldStaticGone) {
    findings.push({
      level: 'info',
      message: `engineer-trigger-button group aria-label dynamic (item title) OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `engineer-trigger-button group aria-label 不完全 (dynamic=${hasDynamicLabel} oldGone=${oldStaticGone})`,
    })
  }

  // iter798 invariant: items-board view switcher 6 main button aria-label
  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  if (
    /aria-label="Today \(今日のタスク優先順、scheduledFor=今日 \+ 期限近接\)"/.test(ib) &&
    /aria-label="Dashboard \(PDCA \/ 進捗 \/ 健全性 widget の集約画面\)"/.test(ib)
  ) {
    findings.push({
      level: 'info',
      message: `iter798 invariant: items-board view switcher aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter798 invariant: 破壊` })
  }

  // iter797 invariant: calendar-view nav group dynamic
  const cv = readFileSync(
    resolve(process.cwd(), 'src/components/schedule/calendar-view.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`カレンダー日付ナビゲーション \(現在: \$\{format\(date, 'yyyy年M月d日 \(eee\)'\)\}、前日 \/ 翌日 \/ 今日\)`\}/.test(
      cv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter797 invariant: calendar-view nav group aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter797 invariant: 破壊` })
  }

  // iter793 invariant: sprint-edit form aria-label dynamic
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (/aria-label=\{`Sprint「\$\{sprint\.name\}」期間編集フォーム`\}/.test(sp)) {
    findings.push({
      level: 'info',
      message: `iter793 invariant: sprint-edit form aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter793 invariant: 破壊` })
  }

  // iter735 invariant: team-context-editor
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

  console.log(`\n=== Findings (engineer-trigger-group-aria-iter799) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
