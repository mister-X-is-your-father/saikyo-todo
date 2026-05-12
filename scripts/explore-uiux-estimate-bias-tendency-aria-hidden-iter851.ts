/**
 * Phase 6.15 loop iter 851 (mode-D Desktop a11y) —
 * estimate-bias-insight EstimateBiasInsight tendency Badge 内 visible {label} text を
 * aria-hidden span で wrap (iter800-850 sweep の続編、dashboard-chip canonical pattern)。
 *
 * 課題: estimate-bias-insight.tsx 行 112-118 の tendency Badge は parent <span> に
 *   aria-label={`傾向: ${label}`} が完全 content を含むのに、内側 visible {label}
 *   text は aria-hidden 無し。SR ユーザは aria-label を聞いた後、内側 text が
 *   再度読み上げられる AT 実装ありで重複可能性。iter800-850 と同 pattern。
 *
 * fix (1 ファイル ~2 行差分):
 *   - tendency Badge 内 {label} を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter735/848/849/850 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ebi = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/estimate-bias-insight.tsx'),
    'utf8',
  )
  // 修正: aria-label={`傾向: ${label}`} 直下 <span aria-hidden="true">{label}</span>
  const hasAriaLabel = /aria-label=\{`傾向: \$\{label\}`\}/.test(ebi)
  const hasInnerHidden = /<span aria-hidden="true">\{label\}<\/span>/.test(ebi)
  if (hasAriaLabel && hasInnerHidden) {
    findings.push({
      level: 'info',
      message: `iter851: estimate-bias-tendency Badge 内 {label} aria-hidden span OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter851: tendency Badge aria-hidden 不完全 (aria-label=${hasAriaLabel} inner-hidden=${hasInnerHidden})`,
    })
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

  // iter848 invariant: quick-add submit button visible text aria-hidden span
  const qa = readFileSync(resolve(process.cwd(), 'src/components/workspace/quick-add.tsx'), 'utf8')
  if (/<span aria-hidden="true">/.test(qa)) {
    findings.push({
      level: 'info',
      message: `iter848 invariant: quick-add submit visible aria-hidden span 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter848 invariant: 破壊` })
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

  console.log(`\n=== Findings (iter851) ===`)
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
