/**
 * Phase 6.15 loop iter 911 (mode-D Desktop a11y) —
 * estimate-bias-insight dl 内 3 div (見積内 / ±10%以内 / 超過) を aria-hidden 化、
 * parent dl aria-label "見積バイアス内訳 (...)" 単独経路に統一。
 *
 * 経緯: iter907/909/910 続編 (dl aria-label 完全集約 + 子 div aria-hidden pattern)。
 *   estimate-bias-insight も同 pattern (3 dt/dd 集約 aria-label)。
 *
 * 修正: 3 div に aria-hidden="true" 追加 (data-testid 維持で E2E 識別子保全)。
 *
 * 検証: source-side regex assert + iter735/843/849-910 invariant cross-check。
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

  // 1. 3 div aria-hidden 追加
  const ariaHiddenDivCount = (ebi.match(/<div aria-hidden="true">\s*<dt>/g) ?? []).length
  if (ariaHiddenDivCount >= 3) {
    findings.push({
      level: 'info',
      message: `estimate-bias 3 div (under / on / over) aria-hidden OK (${ariaHiddenDivCount} 箇所)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `estimate-bias 3 div aria-hidden 不足 (現在 ${ariaHiddenDivCount}、期待 3)`,
    })
  }

  // 2. dl aria-label 維持
  if (
    /aria-label=\{`見積バイアス内訳 \(見積内 \$\{report\.underCount\} 件 \/ ±10% 以内 \$\{report\.onCount\} 件 \/ 超過 \$\{report\.overCount\} 件\)`\}/.test(
      ebi,
    )
  ) {
    findings.push({
      level: 'info',
      message: `estimate-bias dl aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `estimate-bias dl aria-label 破壊`,
    })
  }

  // 3. data-testid 維持
  if (
    /data-testid="estimate-bias-under"/.test(ebi) &&
    /data-testid="estimate-bias-on"/.test(ebi) &&
    /data-testid="estimate-bias-over"/.test(ebi)
  ) {
    findings.push({
      level: 'info',
      message: `estimate-bias 3 data-testid 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `estimate-bias data-testid 破壊`,
    })
  }

  // iter910 invariant
  const cc = readFileSync(
    resolve(process.cwd(), 'src/components/pdca/cycle-check-stats-card.tsx'),
    'utf8',
  )
  if (
    (cc.match(/<div aria-hidden="true">\s*<dt className="text-muted-foreground">/g) ?? []).length >=
    6
  ) {
    findings.push({
      level: 'info',
      message: `iter910 invariant: cycle-check 6 div aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter910 invariant: 破壊` })
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

  console.log(`\n=== Findings (estimate-bias-dl-aria-hidden-iter911) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
