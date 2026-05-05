/**
 * Phase 6.15 loop iter 806 (mode-D Desktop a11y) —
 * sprints-panel SprintCard / goals-panel GoalCard status Badge 内 visible text を
 * aria-hidden span で wrap (dashboard-chip canonical pattern 適用)。
 *
 * 課題: sprints-panel.tsx 行 504-510 と goals-panel.tsx 行 454-460 の status Badge は
 *   parent Badge に aria-label が付いているのに内側 visible text は aria-hidden 無し。
 *   dashboard-chip.tsx canonical pattern (aria-label 経路に統一、visible text を
 *   aria-hidden span で wrap) を適用すべき。iter800-804 sweep の続編。
 *
 * fix (2 ファイル ~4 行差分、2 Badge 各々の visible text を aria-hidden span に wrap):
 *   - sprints-panel SprintCard 内 {sprintStatusLabelJa(status)} を <span aria-hidden="true"> で wrap
 *   - goals-panel GoalCard 内 {goalStatusLabelJa(status)} を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter735-805 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  const hasSprintBadgeAriaHidden =
    /<span aria-hidden="true">\{sprintStatusLabelJa\(status\)\}<\/span>/.test(sp)
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  const hasGoalBadgeAriaHidden =
    /<span aria-hidden="true">\{goalStatusLabelJa\(status\)\}<\/span>/.test(gp)
  if (hasSprintBadgeAriaHidden && hasGoalBadgeAriaHidden) {
    findings.push({
      level: 'info',
      message: `sprint + goal status Badge 内 visible text aria-hidden span OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `status Badge aria-hidden 不完全 (sprint=${hasSprintBadgeAriaHidden} goal=${hasGoalBadgeAriaHidden})`,
    })
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

  console.log(`\n=== Findings (status-badge-aria-hidden-iter806) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
