/**
 * Phase 6.15 loop iter 875 (mode-D Desktop a11y) —
 * gantt-view の MUST badge inline span (role="img" wrapper) 内 visible "MUST" を
 * <span aria-hidden="true"> で wrap し、aria-label 単独経路に統一。
 *
 * 経緯: iter873/874 で MUST checkbox label sweep 済。MustBadge 共通 component は
 *   既に span aria-hidden 化済 (iter873 invariant) だが、gantt-view の inline 簡易版
 *   (`<span role="img" aria-label="MUST タスク">MUST</span>`) は visible aria-hidden 無し。
 *   role="img" + aria-label でも browser SR が visible text を fallback として読む可能性
 *   があるため明示的に aria-hidden 化。
 *
 * 修正: visible "MUST" を <span aria-hidden="true"> で wrap、aria-label 単独経路に統一。
 *
 * 検証: source-side regex assert + iter735/843/849-874 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')

  // 1. inline MUST span 内 visible "MUST" を nested span aria-hidden で wrap
  if (
    /<span[\s\S]+?role="img"[\s\S]+?aria-label="MUST タスク"[\s\S]+?>\s*<span aria-hidden="true">MUST<\/span>/.test(
      gv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `gantt-view inline MUST badge visible "MUST" nested aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `gantt-view inline MUST badge visible aria-hidden 未統合`,
    })
  }

  // 2. aria-label "MUST タスク" + role="img" 維持
  if (/role="img"[\s\S]+?aria-label="MUST タスク"/.test(gv)) {
    findings.push({
      level: 'info',
      message: `gantt-view inline MUST badge role="img" + aria-label "MUST タスク" 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `gantt-view inline MUST badge role/aria-label 破壊`,
    })
  }

  // 3. iter868 invariant: gantt-view jump-today
  if (/<span aria-hidden="true">今日へジャンプ<\/span>/.test(gv)) {
    findings.push({
      level: 'info',
      message: `iter868 invariant: gantt-view jump-today aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter868 invariant: 破壊` })
  }

  // 4. iter872 invariant
  if (
    /<span aria-hidden="true">依存線<\/span>/.test(gv) &&
    /<span aria-hidden="true">完了済を隠す<\/span>/.test(gv)
  ) {
    findings.push({
      level: 'info',
      message: `iter872 invariant: gantt-view filter labels aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter872 invariant: 破壊` })
  }

  // iter874 invariant
  const tie = readFileSync(
    resolve(process.cwd(), 'src/components/template/template-items-editor.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">MUST \(絶対落とさない\)<\/span>/.test(tie)) {
    findings.push({
      level: 'info',
      message: `iter874 invariant: template-items-editor MUST 絶対落とさない aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter874 invariant: 破壊` })
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

  console.log(`\n=== Findings (gantt-must-badge-aria-hidden-iter875) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
