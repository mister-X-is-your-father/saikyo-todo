/**
 * Phase 6.15 loop iter 836 (mode-D Desktop a11y) —
 * sprint + goal create button visible "作成" / "作成中…" を aria-hidden span で wrap (一括)。
 *
 * 課題: sprints-panel + goals-panel の Sprint/Goal 作成 button visible text は
 *   parent Button に aria-label が完全 content を含むのに aria-hidden 無し。
 *
 * fix (2 ファイル ~2 行差分):
 *   - sprint create button visible "作成" / "作成中…" を aria-hidden で wrap
 *   - goal create button visible "作成" / "作成中…" を aria-hidden で wrap
 *
 * 検証: source-side regex assert + iter735-835 invariant cross-check。
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
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  const sprintCreateAriaHidden =
    /<span aria-hidden="true">\{createMut\.isPending \? '作成中…' : '作成'\}<\/span>/.test(sp)
  const goalCreateAriaHidden =
    /<span aria-hidden="true">\{createMut\.isPending \? '作成中…' : '作成'\}<\/span>/.test(gp)
  if (sprintCreateAriaHidden && goalCreateAriaHidden) {
    findings.push({
      level: 'info',
      message: `sprint + goal create button visible aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint/goal create button aria-hidden 不完全 (sprint=${sprintCreateAriaHidden} goal=${goalCreateAriaHidden})`,
    })
  }

  // iter835 invariant: template-items-editor 追加 button aria-hidden
  const tie = readFileSync(
    resolve(process.cwd(), 'src/components/template/template-items-editor.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\+ 追加<\/span>/.test(tie)) {
    findings.push({
      level: 'info',
      message: `iter835 invariant: template-items-editor 追加 button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter835 invariant: 破壊` })
  }

  // iter834 invariant: heartbeat + start-timer button aria-hidden
  const hb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/heartbeat-button.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{scan\.isPending \? 'スキャン中…' : 'Heartbeat'\}<\/span>/.test(hb)
  ) {
    findings.push({
      level: 'info',
      message: `iter834 invariant: heartbeat-button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter834 invariant: 破壊` })
  }

  // iter826 invariant: backlog updatedAt time semantic
  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )
  if (/<time dateTime=\{iso\} aria-label=\{`最終更新 \$\{display\}`\}>/.test(bv)) {
    findings.push({
      level: 'info',
      message: `iter826 invariant: backlog updatedAt time semantic 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter826 invariant: 破壊` })
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

  console.log(`\n=== Findings (sprint-goal-create-aria-hidden-iter836) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
