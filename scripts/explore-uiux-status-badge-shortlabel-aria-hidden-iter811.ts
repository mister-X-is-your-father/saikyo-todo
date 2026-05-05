/**
 * Phase 6.15 loop iter 811 (mode-D Desktop a11y) —
 * status-badge.tsx (Item.status の graphical badge) で visible shortLabel span を
 * aria-hidden 化 (Today / Inbox / Backlog / Personal-period 等で多用される共通 component)。
 *
 * 課題: status-badge.tsx 行 74 の visible shortLabel span は parent Badge に aria-label
 *   "ステータス: ${cfg.label}" が付いているのに aria-hidden 無しで SR が重複読み上げ。
 *   Badge は "Today / Inbox / Backlog / Personal-period / Dashboard / Archive" など
 *   多 view で多用される hot-path component なので、修正効果は workspace 全体に波及。
 *   iter800-810 sweep の続編。iconOnly=true 時は sr-only 経由で SR にも届くので
 *   現状維持、visible 時のみ aria-hidden 化。
 *
 * fix (1 ファイル ~5 行差分):
 *   - !iconOnly 分岐の <span>{cfg.shortLabel}</span> を <span aria-hidden="true">{cfg.shortLabel}</span> に変更
 *
 * 検証: source-side regex assert + iter735-810 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const sb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/status-badge.tsx'),
    'utf8',
  )
  const hasVisibleAriaHidden = /<span aria-hidden="true">\{cfg\.shortLabel\}<\/span>/.test(sb)
  const hasSrOnly = /<span className="sr-only">\{cfg\.shortLabel\}<\/span>/.test(sb)
  if (hasVisibleAriaHidden && hasSrOnly) {
    findings.push({
      level: 'info',
      message: `status-badge visible shortLabel aria-hidden + iconOnly sr-only OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `status-badge shortLabel aria-hidden 不完全 (visible=${hasVisibleAriaHidden} srOnly=${hasSrOnly})`,
    })
  }

  // iter810 invariant: filter-count aria-hidden span
  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  if (
    /data-testid="filter-count"[\s\S]*?<span aria-hidden="true">[\s\S]*?\{filterActive/.test(ib)
  ) {
    findings.push({
      level: 'info',
      message: `iter810 invariant: filter-count aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter810 invariant: 破壊` })
  }

  // iter809 invariant: operation-board forecast aria-hidden
  const obw = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )
  if (
    /font-medium tabular-nums" aria-hidden="true"/.test(obw) &&
    /text-\[11px\] opacity-80" aria-hidden="true"/.test(obw)
  ) {
    findings.push({
      level: 'info',
      message: `iter809 invariant: operation-board forecast aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter809 invariant: 破壊` })
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

  console.log(`\n=== Findings (status-badge-shortlabel-aria-hidden-iter811) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
