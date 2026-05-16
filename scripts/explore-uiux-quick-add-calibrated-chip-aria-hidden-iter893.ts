/**
 * Phase 6.15 loop iter 893 (mode-D Desktop a11y) —
 * quick-add の preview chip "校正後" (calibrated estimate) inner visible を
 * <span aria-hidden="true"> で wrap し、role="img" + aria-label 単独経路に統一。
 *
 * 経緯: iter875 で gantt-view inline MUST badge (role="img" wrapper) 同 pattern を
 *   修正済の続編。quick-add の calibrated estimate chip は role="img" + aria-label
 *   "校正後 ${formatEstimate} (...)"  完全 content を持つが、visible
 *   "→ ${formatEstimate}" は aria-hidden 無し → SR が role="img" の name 後に
 *   visible text も fallback 読みする可能性あり。
 *
 * 修正: visible "→ ${formatEstimate(calibrated.calibratedMinutes)}" を
 *   <span aria-hidden="true"> で wrap、aria-label 単独経路に統一。
 *
 * 検証: source-side regex assert + iter735/843/849-892 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const qa = readFileSync(resolve(process.cwd(), 'src/components/workspace/quick-add.tsx'), 'utf8')

  // 1. calibrated chip 内 visible "→ ${formatEstimate(calibrated.calibratedMinutes)}" を span aria-hidden で wrap
  if (
    /<span aria-hidden="true">→ \{formatEstimate\(calibrated\.calibratedMinutes\)\}<\/span>/.test(
      qa,
    )
  ) {
    findings.push({
      level: 'info',
      message: `quick-add calibrated chip visible "→ ${'${formatEstimate}'}" aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `quick-add calibrated chip visible aria-hidden 未統合`,
    })
  }

  // 2. role="img" + aria-label 維持
  if (
    /role="img"[\s\S]+?aria-label=\{`校正後 \$\{formatEstimate\(calibrated\.calibratedMinutes\)\}/.test(
      qa,
    )
  ) {
    findings.push({
      level: 'info',
      message: `quick-add calibrated chip role="img" + aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `quick-add calibrated chip role/aria-label 破壊`,
    })
  }

  // 3. data-testid 維持
  if (/data-testid="quick-add-estimate-calibrated"/.test(qa)) {
    findings.push({
      level: 'info',
      message: `quick-add calibrated chip data-testid 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `quick-add calibrated chip data-testid 破壊`,
    })
  }

  // iter883 invariant: quick-add input h-11 維持
  if (/className="h-11 flex-1"/.test(qa)) {
    findings.push({
      level: 'info',
      message: `iter883 invariant: quick-add input h-11 flex-1 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter883 invariant: 破壊` })
  }

  // iter875 invariant: gantt-view inline MUST badge aria-hidden
  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')
  if (
    /<span[\s\S]+?role="img"[\s\S]+?aria-label="MUST タスク"[\s\S]+?>\s*<span aria-hidden="true">MUST<\/span>/.test(
      gv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter875 invariant: gantt-view inline MUST badge aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter875 invariant: 破壊` })
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

  console.log(`\n=== Findings (quick-add-calibrated-chip-aria-hidden-iter893) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
