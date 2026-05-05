/**
 * Phase 6.15 loop iter 800 (mode-D Desktop a11y) —
 * tag-picker trigger Button 内の visible chip wrapper を aria-hidden 化して
 * SR 重複読み上げを抑制。
 *
 * 課題: tag-picker.tsx 行 97-113 の Button 内 visible content (タグ chip 群 or
 *   "タグなし" span) は parent Button に既に aria-label が付いており tag 名を
 *   完全に展開しているのに、内側 visible span にも tag.name が text として
 *   含まれていた。SR ユーザは Button focus で aria-label を聞いた後、内側の
 *   tag chip text も再度読み上げられて重複だった。
 *
 *   既存 TagIcon は aria-hidden="true" 済 (line 96)、内側 span にも同 pattern を
 *   適用すべき (iter98 PDCA bar / iter441 active-timer / iter781-783 progressbar
 *   inner aria-hidden sweep と同 pattern)。
 *
 * fix (1 ファイル ~2 行差分):
 *   - 「タグなし」 span に aria-hidden="true" 追加
 *   - 選択 chip wrapper span に aria-hidden="true" 追加
 *
 * 検証: source-side regex assert + iter735-799 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tp = readFileSync(resolve(process.cwd(), 'src/components/workspace/tag-picker.tsx'), 'utf8')
  const hasNoneAriaHidden =
    /<span className="text-muted-foreground" aria-hidden="true">\s*\n?\s*タグなし\s*\n?\s*<\/span>/.test(
      tp,
    )
  const hasFlexAriaHidden = /<span className="flex flex-wrap gap-1" aria-hidden="true">/.test(tp)
  if (hasNoneAriaHidden && hasFlexAriaHidden) {
    findings.push({
      level: 'info',
      message: `tag-picker trigger visible chip wrapper aria-hidden OK (2 箇所)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `tag-picker trigger aria-hidden 不完全 (none=${hasNoneAriaHidden} flex=${hasFlexAriaHidden})`,
    })
  }

  // iter799 invariant: engineer-trigger-button group aria-label dynamic
  const etb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/engineer-trigger-button.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`「\$\{item\.title\}」を Engineer Agent に投入 \(PR 自動起票 toggle \/ 実装起動\)`\}/.test(
      etb,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter799 invariant: engineer-trigger-button group aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter799 invariant: 破壊` })
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

  console.log(`\n=== Findings (tag-picker-trigger-aria-hidden-iter800) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
