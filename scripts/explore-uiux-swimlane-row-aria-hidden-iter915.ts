/**
 * Phase 6.15 loop iter 915 (mode-D Desktop a11y) —
 * sprint-swimlane-disclosure 内 2 箇所 (population div + lane loadSummary span) の
 * visible text を aria-hidden 化、parent aria-label 単独 SR 経路に統一
 * (iter900/902/904/914 と同 pattern を sprint swimlane に展開)。
 *
 * 経緯: 2 箇所とも parent aria-label が完全 content を持つにも関わらず内側
 *   visible text aria-hidden 無し → SR 二重読み:
 *   - population div: aria-label "Sprint 全体: {populationLabel}" + 内側
 *     {populationLabel} (= 同 string)
 *   - lane span: aria-label "lane: {loadSummaryJa} / {conflictsJa}" + 内側
 *     {loadSummaryJa} (= label の subset)
 *
 * 修正 (+2/-2 行、1 file): 2 箇所内側 visible 文字列を <span aria-hidden="true">
 *   で wrap。parent aria-label / data-testid は維持 (E2E + a11y tree 経路保全)。
 *
 * 検証: source-side regex assert + iter735/914 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const swd = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprint-swimlane-disclosure.tsx'),
    'utf8',
  )

  // 1. population div 内側 aria-hidden 追加 OK
  if (/<span aria-hidden="true">\{populationLabel\}<\/span>/.test(swd)) {
    findings.push({
      level: 'info',
      message: `swimlane population div 内側 aria-hidden 追加 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `swimlane population div 内側 aria-hidden 欠落`,
    })
  }

  // 2. population div parent aria-label 維持
  if (/aria-label=\{`Sprint 全体: \$\{populationLabel\}`\}/.test(swd)) {
    findings.push({
      level: 'info',
      message: `swimlane population div parent aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `swimlane population div parent aria-label 破壊`,
    })
  }

  // 3. lane loadSummary span 内側 aria-hidden 追加 OK
  if (/<span aria-hidden="true">\{row\.loadSummaryJa\}<\/span>/.test(swd)) {
    findings.push({
      level: 'info',
      message: `swimlane lane loadSummary span 内側 aria-hidden 追加 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `swimlane lane loadSummary span 内側 aria-hidden 欠落`,
    })
  }

  // 4. lane span parent aria-label 維持
  if (/aria-label=\{`lane: \$\{row\.loadSummaryJa\} \/ \$\{row\.conflictsJa\}`\}/.test(swd)) {
    findings.push({
      level: 'info',
      message: `swimlane lane span parent aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `swimlane lane span parent aria-label 破壊`,
    })
  }

  // 5. outer group aria-label 維持
  if (
    /aria-label=\{`Sprint「\$\{sprintName\}」 担当者 swim-lane \(lane \$\{rows\.length\} 件\)`\}/.test(
      swd,
    )
  ) {
    findings.push({
      level: 'info',
      message: `swimlane outer group aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `swimlane outer group aria-label 破壊`,
    })
  }

  // 6. bar role="img" aria-label invariant
  if (
    /role="img"\s*\n\s*aria-label=\{\(\(\) => \{[\s\S]*?conflicted > 0[\s\S]*?\`bar 数/.test(swd)
  ) {
    findings.push({
      level: 'info',
      message: `swimlane bar role="img" aria-label invariant 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `swimlane bar role="img" aria-label invariant 破壊`,
    })
  }

  // iter914 invariant: integrations 統計 span 内側 aria-hidden
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\s*f=\{r\.fetchedCount\} \/ c=\{r\.createdCount\} \/ u=\{r\.updatedCount\}\s*<\/span>/.test(
      ip,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter914 invariant: integrations 統計 span 内側 aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter914 invariant: 破壊` })
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

  console.log(`\n=== Findings (swimlane-row-aria-hidden-iter915) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
