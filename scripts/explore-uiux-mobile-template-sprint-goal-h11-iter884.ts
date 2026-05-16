/**
 * Phase 6.15 loop iter 884 (mode-M Mobile a11y) —
 * templates-panel + sprints-panel + goals-panel の primary IMEInput 5 個に
 * className="h-11" 追加 (mobile tap target 44x44 適合)。
 *
 * 経緯: iter881-883 続編。/templates / /sprints / /goals の form input が h-8 (32px)
 *   で WCAG 2.5.5 AAA Touch Target 不足。各 panel の主要 input (name / cron / KR title)
 *   に className="h-11" 追加で統一。
 *
 * 修正: 5 input
 *   - templates-panel: tmpl-name + tmpl-cron (cron は h-11 + font-mono 統合)
 *   - sprints-panel: sprint-name
 *   - goals-panel: goal-title + KR title (flex-1 と統合)
 *
 * 検証: source-side regex assert + iter735/843/849-883 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tp = readFileSync(
    resolve(process.cwd(), 'src/components/template/templates-panel.tsx'),
    'utf8',
  )
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )

  // 1. templates-panel: tmpl-name h-11
  if (
    /<IMEInput[\s\S]+?id="tmpl-name"[\s\S]+?className="h-11"/.test(tp) ||
    /<IMEInput[\s\S]+?className="h-11"[\s\S]+?id="tmpl-name"/.test(tp)
  ) {
    findings.push({
      level: 'info',
      message: `templates-panel tmpl-name h-11 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `templates-panel tmpl-name h-11 未統合`,
    })
  }

  // 2. templates-panel: tmpl-cron h-11 統合 ("h-11 font-mono")
  if (/className="h-11 font-mono"/.test(tp)) {
    findings.push({
      level: 'info',
      message: `templates-panel tmpl-cron "h-11 font-mono" 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `templates-panel tmpl-cron 統合 未完了`,
    })
  }

  // 3. sprints-panel: sprint-name h-11
  if (
    /<IMEInput[\s\S]+?id="sprint-name"[\s\S]+?className="h-11"/.test(sp) ||
    /<IMEInput[\s\S]+?className="h-11"[\s\S]+?id="sprint-name"/.test(sp)
  ) {
    findings.push({
      level: 'info',
      message: `sprints-panel sprint-name h-11 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprints-panel sprint-name h-11 未統合`,
    })
  }

  // 4. goals-panel: goal-title h-11
  if (
    /<IMEInput[\s\S]+?id="goal-title"[\s\S]+?className="h-11"/.test(gp) ||
    /<IMEInput[\s\S]+?className="h-11"[\s\S]+?id="goal-title"/.test(gp)
  ) {
    findings.push({
      level: 'info',
      message: `goals-panel goal-title h-11 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `goals-panel goal-title h-11 未統合`,
    })
  }

  // 5. goals-panel: KR title "h-11 flex-1" 統合
  if (/className="h-11 flex-1"/.test(gp)) {
    findings.push({
      level: 'info',
      message: `goals-panel KR title "h-11 flex-1" 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `goals-panel KR title 統合 未完了`,
    })
  }

  // iter883 invariant
  const cwf = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/create-workspace-form.tsx'),
    'utf8',
  )
  const qa = readFileSync(resolve(process.cwd(), 'src/components/workspace/quick-add.tsx'), 'utf8')
  if ((cwf.match(/className="h-11"/g) ?? []).length >= 2 && /className="h-11 flex-1"/.test(qa)) {
    findings.push({
      level: 'info',
      message: `iter883 invariant: create-ws-form + quick-add h-11 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter883 invariant: 破壊` })
  }

  // shadcn UI 編集なし
  const inputUi = readFileSync(resolve(process.cwd(), 'src/components/ui/input.tsx'), 'utf8')
  if (/h-8/.test(inputUi)) {
    findings.push({
      level: 'info',
      message: `shadcn Input default h-8 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `shadcn Input 編集された` })
  }

  // iter735 invariant
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

  console.log(`\n=== Findings (mobile-template-sprint-goal-h11-iter884) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
