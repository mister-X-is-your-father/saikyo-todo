/**
 * Phase 6.15 loop iter 812 (mode-D Desktop a11y) —
 * must-badge.tsx (Item.isMust の graphical badge) で visible "MUST" span を
 * aria-hidden 化 (status-badge と同 pattern、6 view で多用される hot-path component)。
 *
 * 課題: must-badge.tsx 行 42 の visible "MUST" span は parent <span role="img">
 *   に aria-label="MUST タスク" が付いている (= AT は atomic image として
 *   aria-label 単独経路) のに、内部 visible span に aria-hidden 無し。
 *   role="img" の atomic 効果に依存していたが、明示的に aria-hidden を付けた方が
 *   AT 実装ばらつきに頑健。iter811 status-badge と同 pattern。
 *
 * fix (1 ファイル ~1 行差分):
 *   - !iconOnly 分岐の <span>MUST</span> を <span aria-hidden="true">MUST</span> に変更
 *
 * 検証: source-side regex assert + iter735-811 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const mb = readFileSync(resolve(process.cwd(), 'src/components/workspace/must-badge.tsx'), 'utf8')
  const hasVisibleAriaHidden = /<span aria-hidden="true">MUST<\/span>/.test(mb)
  const hasSrOnly = /<span className="sr-only">MUST<\/span>/.test(mb)
  if (hasVisibleAriaHidden && hasSrOnly) {
    findings.push({
      level: 'info',
      message: `must-badge visible "MUST" aria-hidden + iconOnly sr-only OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `must-badge aria-hidden 不完全 (visible=${hasVisibleAriaHidden} srOnly=${hasSrOnly})`,
    })
  }

  // iter811 invariant: status-badge shortLabel aria-hidden
  const sb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/status-badge.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{cfg\.shortLabel\}<\/span>/.test(sb) &&
    /<span className="sr-only">\{cfg\.shortLabel\}<\/span>/.test(sb)
  ) {
    findings.push({
      level: 'info',
      message: `iter811 invariant: status-badge shortLabel aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter811 invariant: 破壊` })
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

  console.log(`\n=== Findings (must-badge-aria-hidden-iter812) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
