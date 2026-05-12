/**
 * Phase 6.15 loop iter 853 (mode-D Desktop a11y) —
 * comment-thread.tsx AI Agent badge 内 visible "AI" text を aria-hidden span で
 * wrap (iter800-852 sweep の続編、dashboard-chip canonical pattern)。
 *
 * 課題: comment-thread.tsx 行 187-194 の AI Agent badge は parent <span>
 *   (role="img") に aria-label="AI Agent による投稿" が完全 content を含むのに、
 *   内側 visible "AI" text は aria-hidden 無し。SR ユーザは aria-label を聞いた後、
 *   内側 text が再度読み上げられる AT 実装で重複。AI Agent コメントは AI 分業
 *   workflow の頻出識別子 (Item edit dialog / アクティビティ等で常時可視) のため
 *   SR UX 影響大。
 *
 * fix (1 ファイル ~1 行差分):
 *   - "AI" visible text を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter735/850/851/852 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ct = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/comment-thread.tsx'),
    'utf8',
  )
  const hasAriaLabel = /aria-label="AI Agent による投稿"/.test(ct)
  const hasInnerHidden = /<span aria-hidden="true">AI<\/span>/.test(ct)
  if (hasAriaLabel && hasInnerHidden) {
    findings.push({
      level: 'info',
      message: `iter853: comment-thread AI Agent badge 内 visible "AI" aria-hidden span OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter853: AI Agent badge aria-hidden 不完全 (aria-label=${hasAriaLabel} inner-hidden=${hasInnerHidden})`,
    })
  }

  // iter852 invariant: SeverityChip inner {label}/{delta} aria-hidden span 維持
  const sc = readFileSync(resolve(process.cwd(), 'src/components/shared/severity-chip.tsx'), 'utf8')
  const labelHidden = /<span aria-hidden="true" className="truncate font-medium">/.test(sc)
  const deltaHidden =
    /<span\s+aria-hidden="true"\s+className="shrink-0 text-\[10px\] font-semibold opacity-90">/.test(
      sc,
    )
  if (labelHidden && deltaHidden) {
    findings.push({
      level: 'info',
      message: `iter852 invariant: SeverityChip inner aria-hidden span 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter852 invariant: 破壊 (label=${labelHidden} delta=${deltaHidden})`,
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

  console.log(`\n=== Findings (iter853) ===`)
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
