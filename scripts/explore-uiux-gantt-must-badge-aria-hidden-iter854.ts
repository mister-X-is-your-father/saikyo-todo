/**
 * Phase 6.15 loop iter 854 (mode-D Desktop a11y) —
 * gantt-view.tsx inline MUST badge 内 visible "MUST" を aria-hidden span で wrap
 * (iter800-853 sweep の続編)。
 *
 * 課題: gantt-view.tsx 行 596-604 の inline MUST badge は parent <span role="img">
 *   に aria-label="MUST タスク" が完全 content を含むのに、内側 visible "MUST" text は
 *   aria-hidden 無し。SR ユーザは aria-label を聞いた後、内側 text が再度読み上げ
 *   される AT 実装で重複。Gantt view は週次計画 mode で多用される頻出 view。
 *   既存共有 MustBadge component (visible "MUST" を aria-hidden 済) と pattern 統一。
 *
 * fix (1 ファイル ~1 行差分):
 *   - "MUST" visible text を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter735/851/852/853 invariant cross-check。
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
  const hasAriaLabel = /aria-label="MUST タスク"/.test(gv)
  const hasInnerHidden = /<span aria-hidden="true">MUST<\/span>/.test(gv)
  if (hasAriaLabel && hasInnerHidden) {
    findings.push({
      level: 'info',
      message: `iter854: gantt-view inline MUST badge 内 visible "MUST" aria-hidden span OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter854: MUST badge aria-hidden 不完全 (aria-label=${hasAriaLabel} inner-hidden=${hasInnerHidden})`,
    })
  }

  // iter853 invariant: comment-thread AI badge aria-hidden span 維持
  const ct = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/comment-thread.tsx'),
    'utf8',
  )
  if (
    /aria-label="AI Agent による投稿"/.test(ct) &&
    /<span aria-hidden="true">AI<\/span>/.test(ct)
  ) {
    findings.push({
      level: 'info',
      message: `iter853 invariant: comment-thread AI badge aria-hidden span 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter853 invariant: 破壊` })
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
    findings.push({ level: 'warning', message: `iter852 invariant: 破壊` })
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

  // 共有 MustBadge との pattern 一致確認 (parallel reference)
  const mb = readFileSync(resolve(process.cwd(), 'src/components/workspace/must-badge.tsx'), 'utf8')
  if (/aria-label="MUST タスク"/.test(mb) && /<span aria-hidden="true">MUST<\/span>/.test(mb)) {
    findings.push({
      level: 'info',
      message: `iter854 reference: 共有 MustBadge も同 pattern (visible "MUST" を aria-hidden span で wrap)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter854 reference: MustBadge pattern 不一致 (規約 drift)`,
    })
  }

  console.log(`\n=== Findings (iter854) ===`)
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
