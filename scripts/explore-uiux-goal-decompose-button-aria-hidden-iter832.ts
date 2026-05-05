/**
 * Phase 6.15 loop iter 832 (mode-D Desktop a11y) —
 * goals-panel Goal AI 分解 button visible text を aria-hidden span で wrap。
 *
 * 課題: goals-panel.tsx 行 594 の Goal AI 分解 button visible text "AI 分解中…" /
 *   "AI 分解" は parent Button に aria-label が完全 content を含むのに aria-hidden 無し。
 *   iter800-831 sweep の続編。
 *
 * fix (1 ファイル ~1 行差分):
 *   - 内側 visible text を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter735-831 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  const hasAriaHidden =
    /<span aria-hidden="true">\{decompose\.isPending \? 'AI 分解中…' : 'AI 分解'\}<\/span>/.test(gp)
  if (hasAriaHidden) {
    findings.push({
      level: 'info',
      message: `goals-panel Goal AI 分解 button visible aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `goals-panel Goal AI 分解 button aria-hidden 不完全`,
    })
  }

  // iter831 invariant: engineer-trigger visible aria-hidden merge
  const etb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/engineer-trigger-button.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">🛠 Engineer に実装させる<\/span>/.test(etb) &&
    /<span aria-hidden="true">起動中…<\/span>/.test(etb)
  ) {
    findings.push({
      level: 'info',
      message: `iter831 invariant: engineer-trigger visible aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter831 invariant: 破壊` })
  }

  // iter830 invariant: home page workspace Link aria-hidden
  const pg = readFileSync(resolve(process.cwd(), 'src/app/page.tsx'), 'utf8')
  if (/<div className="flex items-center justify-between" aria-hidden="true">/.test(pg)) {
    findings.push({
      level: 'info',
      message: `iter830 invariant: home page workspace Link aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter830 invariant: 破壊` })
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

  console.log(`\n=== Findings (goal-decompose-button-aria-hidden-iter832) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
