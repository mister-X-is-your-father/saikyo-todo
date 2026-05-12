/**
 * Phase 6.15 loop iter 852 (mode-D Desktop a11y) —
 * 共有 SeverityChip inner visible {label} / {delta} span を aria-hidden 化
 * (iter800-851 sweep の続編、dashboard-chip canonical pattern を共有 chip layer に適用)。
 *
 * 課題: src/components/shared/severity-chip.tsx 行 56-60 の inner content は
 *   parent <button> / <span> (role="img") に aria-label={ariaLabel ?? label} が
 *   完全 content を含むのに、内側 visible {label} と {delta} span は aria-hidden 無し。
 *   SR ユーザは aria-label を聞いた後、内側 text が再度読み上げられる AT 実装で重複。
 *   SeverityChip は 10+ callsite (diff-summary-bar / sprint-retro-widget /
 *   sprint-risk-board-widget / ai-handoff-phase-chip / cycle-check-stats-card 等)
 *   で使われる shared layer のため、1 箇所修正で全 caller の SR UX 改善。
 *
 * fix (1 ファイル ~4 行差分):
 *   - {label} span に aria-hidden="true" 追加
 *   - {delta} span に aria-hidden="true" 追加
 *
 * 検証: source-side regex assert + iter735/849/850/851 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const sc = readFileSync(resolve(process.cwd(), 'src/components/shared/severity-chip.tsx'), 'utf8')
  const labelHidden = /<span aria-hidden="true" className="truncate font-medium">/.test(sc)
  const deltaHidden =
    /<span aria-hidden="true" className="shrink-0 text-\[10px\] font-semibold opacity-90">/.test(sc)
  if (labelHidden && deltaHidden) {
    findings.push({
      level: 'info',
      message: `iter852: SeverityChip inner {label}/{delta} aria-hidden span OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter852: SeverityChip aria-hidden 不完全 (label=${labelHidden} delta=${deltaHidden})`,
    })
  }

  // iter851 invariant: estimate-bias-tendency Badge aria-hidden span 維持
  const ebi = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/estimate-bias-insight.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`傾向: \$\{label\}`\}/.test(ebi) &&
    /<span aria-hidden="true">\{label\}<\/span>/.test(ebi)
  ) {
    findings.push({
      level: 'info',
      message: `iter851 invariant: estimate-bias-tendency aria-hidden span 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter851 invariant: 破壊` })
  }

  // iter850 invariant: item-edit-dialog Tabs aria-hidden span 群維持
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  const tabCount = (ied.match(/<TabsTrigger\b/g) ?? []).length
  const hiddenSpanCount = (ied.match(/<span aria-hidden="true">/g) ?? []).length
  if (tabCount >= 6 && hiddenSpanCount >= 6) {
    findings.push({
      level: 'info',
      message: `iter850 invariant: item-edit-dialog TabsTrigger ${tabCount} + aria-hidden span ${hiddenSpanCount} 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter850 invariant: 破壊` })
  }

  // iter849 invariant: calendar-view 「今日」 button visible aria-hidden span
  const cv = readFileSync(
    resolve(process.cwd(), 'src/components/schedule/calendar-view.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">今日<\/span>/.test(cv)) {
    findings.push({
      level: 'info',
      message: `iter849 invariant: calendar-view 「今日」 aria-hidden span 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter849 invariant: 破壊` })
  }

  // iter735 invariant: shadcn UI 未編集
  const tabs = readFileSync(resolve(process.cwd(), 'src/components/ui/tabs.tsx'), 'utf8')
  if (!/aria-hidden/.test(tabs)) {
    findings.push({ level: 'info', message: `iter735 invariant: shadcn/tabs.tsx 未編集 OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `iter735 invariant: shadcn tabs.tsx に aria-hidden 編集が混入`,
    })
  }

  console.log(`\n=== Findings (iter852) ===`)
  if (findings.length === 0) console.log('(なし)')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
