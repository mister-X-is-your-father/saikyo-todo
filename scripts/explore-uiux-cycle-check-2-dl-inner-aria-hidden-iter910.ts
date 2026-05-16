/**
 * Phase 6.15 loop iter 910 (mode-D Desktop a11y) —
 * cycle-check-stats-card 2 dl (Lead time / ステータス分布) 内 計 6 div を
 * aria-hidden 化、parent dl aria-label 単独経路に統一。
 *
 * 経緯: iter909 sprint-retro dl 同 pattern の続編。cycle-check-stats-card も
 *   2 dl (Lead time 3 div + ステータス分布 3 div) で parent aria-label が完全 content
 *   集約済 → 子 div aria-hidden 化で多重読み上げ排除。
 *
 * 修正: 6 div に aria-hidden="true" 追加 (Lead time 3 + Status 分布 3)。
 *
 * 検証: source-side regex assert + iter735/843/849-909 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const cc = readFileSync(
    resolve(process.cwd(), 'src/components/pdca/cycle-check-stats-card.tsx'),
    'utf8',
  )

  // 1. 6 div aria-hidden 追加 (Lead time 3 + Status 分布 3)
  const ariaHiddenDivCount = (
    cc.match(/<div aria-hidden="true">\s*<dt className="text-muted-foreground">/g) ?? []
  ).length
  if (ariaHiddenDivCount >= 6) {
    findings.push({
      level: 'info',
      message: `cycle-check 6 div (Lead 3 + Status 3) aria-hidden 追加 OK (${ariaHiddenDivCount} 箇所)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `cycle-check 6 div aria-hidden 不足 (現在 ${ariaHiddenDivCount}、期待 6)`,
    })
  }

  // 2. 2 dl aria-label 維持
  if (
    /aria-label=\{`Lead time 統計 \(平均 \$\{stats\.leadTimeAvgHours\}h/.test(cc) &&
    /aria-label=\{`ステータス分布 \(完了 \$\{stats\.done\} 件/.test(cc)
  ) {
    findings.push({
      level: 'info',
      message: `cycle-check 2 dl aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `cycle-check 2 dl aria-label 破壊`,
    })
  }

  // iter909 invariant
  const srw = readFileSync(
    resolve(process.cwd(), 'src/components/sprint/sprint-retro-widget.tsx'),
    'utf8',
  )
  const srwCount = (
    srw.match(/<div aria-hidden="true">\s*<dt className="text-muted-foreground">/g) ?? []
  ).length
  if (srwCount >= 3) {
    findings.push({
      level: 'info',
      message: `iter909 invariant: sprint-retro 3 div aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter909 invariant: 破壊` })
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

  console.log(`\n=== Findings (cycle-check-2-dl-inner-aria-hidden-iter910) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
