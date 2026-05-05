/**
 * Phase 6.15 loop iter 805 (mode-D Desktop a11y) —
 * item-dependencies-panel 「依存を追加」 Label を item-specific (item.title 含む) 化。
 *
 * 課題: item-dependencies-panel.tsx 行 182 の Label "依存を追加" は静的で、
 *   role="group" の aria-labelledby="dep-add-label" の reference target だが
 *   item title が含まれず SR ユーザは group focus 時にどの Item の依存追加か
 *   分からなかった。iter763 / iter764 / iter793 / iter794 / iter799 page-specific
 *   naming sweep の続編。
 *
 * fix (1 ファイル ~1 行差分):
 *   - Label content を `「${item.title}」の依存を追加` に動的化
 *
 * 検証: source-side regex assert + iter735-804 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const idp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-dependencies-panel.tsx'),
    'utf8',
  )
  const hasDynamicLabel =
    /<Label id="dep-add-label">\{`「\$\{item\.title\}」の依存を追加`\}<\/Label>/.test(idp)
  const oldStaticGone = !idp.includes('<Label id="dep-add-label">依存を追加</Label>')
  if (hasDynamicLabel && oldStaticGone) {
    findings.push({
      level: 'info',
      message: `item-dependencies-panel dep-add Label dynamic (item title) OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `item-dependencies-panel dep-add Label 不完全 (dynamic=${hasDynamicLabel} oldGone=${oldStaticGone})`,
    })
  }

  // iter804 invariant: activity-log chip aria-hidden span
  const al = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/activity-log.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{hint\.label\}<\/span>/.test(al) &&
    /<span aria-hidden="true">⭐ \{formatTopActorJa\(topActor\)\}<\/span>/.test(al)
  ) {
    findings.push({
      level: 'info',
      message: `iter804 invariant: activity-log chip aria-hidden span 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter804 invariant: 破壊` })
  }

  // iter803 invariant: workspace-mode-selector radio inner aria-hidden
  const wms = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/workspace-mode-selector.tsx'),
    'utf8',
  )
  if (
    /<div className="flex items-center gap-1\.5" aria-hidden="true">/.test(wms) &&
    /text-muted-foreground text-\[11px\] leading-tight"\s*\n?\s*aria-hidden="true"/.test(wms)
  ) {
    findings.push({
      level: 'info',
      message: `iter803 invariant: workspace-mode-selector radio inner aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter803 invariant: 破壊` })
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

  console.log(`\n=== Findings (dep-add-label-iter805) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
