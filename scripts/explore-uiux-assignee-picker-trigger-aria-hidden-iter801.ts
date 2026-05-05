/**
 * Phase 6.15 loop iter 801 (mode-D Desktop a11y) —
 * assignee-picker trigger Button 内 visible content を aria-hidden 化 (iter800 同 pattern)。
 *
 * 課題: assignee-picker.tsx 行 101-105 の Button 内 visible content (「未アサイン」 span /
 *   selectedLabels.join(', ') span) は parent Button の aria-label に既に同 content が
 *   含まれているのに aria-hidden 無しで SR が重複読み上げ。iter800 で tag-picker に
 *   同 pattern 適用したのと対称。
 *
 * fix (1 ファイル ~6 行差分、2 span 各々に aria-hidden):
 *   - 「未アサイン」 span に aria-hidden="true" 追加
 *   - selected names truncate span に aria-hidden="true" 追加
 *
 * 検証: source-side regex assert + iter735-800 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ap = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/assignee-picker.tsx'),
    'utf8',
  )
  const hasNoneAriaHidden =
    /<span className="text-muted-foreground" aria-hidden="true">\s*\n?\s*未アサイン\s*\n?\s*<\/span>/.test(
      ap,
    )
  const hasTruncateAriaHidden = /<span className="truncate" aria-hidden="true">/.test(ap)
  if (hasNoneAriaHidden && hasTruncateAriaHidden) {
    findings.push({
      level: 'info',
      message: `assignee-picker trigger Button 内 visible span aria-hidden OK (2 箇所)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `assignee-picker trigger aria-hidden 不完全 (none=${hasNoneAriaHidden} truncate=${hasTruncateAriaHidden})`,
    })
  }

  // iter800 invariant: tag-picker trigger inner aria-hidden
  const tp = readFileSync(resolve(process.cwd(), 'src/components/workspace/tag-picker.tsx'), 'utf8')
  if (
    /<span className="text-muted-foreground" aria-hidden="true">\s*\n?\s*タグなし\s*\n?\s*<\/span>/.test(
      tp,
    ) &&
    /<span className="flex flex-wrap gap-1" aria-hidden="true">/.test(tp)
  ) {
    findings.push({
      level: 'info',
      message: `iter800 invariant: tag-picker trigger inner aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter800 invariant: 破壊` })
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

  console.log(`\n=== Findings (assignee-picker-trigger-aria-hidden-iter801) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
