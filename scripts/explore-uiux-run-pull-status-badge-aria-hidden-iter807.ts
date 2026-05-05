/**
 * Phase 6.15 loop iter 807 (mode-D Desktop a11y) —
 * workflows-panel RunStatusBadge + integrations-panel ImportStatusBadge 内
 * visible text を aria-hidden span で wrap (iter806 同 pattern 拡大)。
 *
 * 課題: workflows-panel.tsx 行 894-905 (RunStatusBadge) と integrations-panel.tsx
 *   行 625-636 (ImportStatusBadge) は parent <span> に aria-label が付いているのに
 *   内側 visible text は aria-hidden 無し。iter806 で sprint+goal status badge に
 *   同 pattern 適用したのと同じく、workflow run / import status にも展開。
 *
 * fix (2 ファイル ~4 行差分):
 *   - RunStatusBadge 内 {label} を <span aria-hidden="true"> で wrap
 *   - ImportStatusBadge 内 {label} を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter735-806 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  const hasRunBadgeAriaHidden =
    /aria-label=\{`実行ステータス: \$\{label\}`\}\s*\n\s*>\s*\n\s*<span aria-hidden="true">\{label\}<\/span>/.test(
      wp,
    )
  const hasImportBadgeAriaHidden =
    /aria-label=\{`Pull ステータス: \$\{label\}`\}\s*\n\s*>\s*\n\s*<span aria-hidden="true">\{label\}<\/span>/.test(
      ip,
    )
  if (hasRunBadgeAriaHidden && hasImportBadgeAriaHidden) {
    findings.push({
      level: 'info',
      message: `RunStatusBadge + ImportStatusBadge 内 visible text aria-hidden span OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `status Badge aria-hidden 不完全 (run=${hasRunBadgeAriaHidden} import=${hasImportBadgeAriaHidden})`,
    })
  }

  // iter806 invariant: sprint + goal status Badge aria-hidden
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{sprintStatusLabelJa\(status\)\}<\/span>/.test(sp) &&
    /<span aria-hidden="true">\{goalStatusLabelJa\(status\)\}<\/span>/.test(gp)
  ) {
    findings.push({
      level: 'info',
      message: `iter806 invariant: sprint + goal status Badge aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter806 invariant: 破壊` })
  }

  // iter805 invariant: dep-add Label item-specific
  const idp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-dependencies-panel.tsx'),
    'utf8',
  )
  if (/<Label id="dep-add-label">\{`「\$\{item\.title\}」の依存を追加`\}<\/Label>/.test(idp)) {
    findings.push({
      level: 'info',
      message: `iter805 invariant: dep-add Label dynamic 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter805 invariant: 破壊` })
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

  console.log(`\n=== Findings (run-pull-status-badge-aria-hidden-iter807) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
