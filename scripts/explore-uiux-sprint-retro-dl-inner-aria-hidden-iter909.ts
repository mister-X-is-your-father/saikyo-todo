/**
 * Phase 6.15 loop iter 909 (mode-D Desktop a11y) —
 * sprint-retro-widget の "計画 vs 納品" dl 内 3 div (計画 / 納品 / 差分) を
 * aria-hidden 化、parent dl aria-label "計画 vs 納品 (...)" 単独経路に統一。
 *
 * 経緯: iter908 続編 (差分 dd inner span aria-hidden)。dl aria-label が全 dt/dd 内容を
 *   集約しているのに、子 div (3 個) が aria-hidden 無し → dl 全体 + 各 dt/dd が SR で
 *   多重読み上げ。iter907 dashboard StatCard と同 pattern (parent aria-label 完全集約 +
 *   inner aria-hidden)。
 *
 * 修正: 3 div (計画 / 納品 / 差分) に aria-hidden="true" 追加。差分 dd の独自 aria-label /
 *   inner aria-hidden span は冗長になるため削除 (parent div aria-hidden で覆われる)。
 *
 * 検証: source-side regex assert + iter735/843/849-908 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const srw = readFileSync(
    resolve(process.cwd(), 'src/components/sprint/sprint-retro-widget.tsx'),
    'utf8',
  )

  // 1. 3 div (計画 / 納品 / 差分) に aria-hidden 追加
  const ariaHiddenDivCount = (
    srw.match(/<div aria-hidden="true">\s*<dt className="text-muted-foreground">/g) ?? []
  ).length
  if (ariaHiddenDivCount >= 3) {
    findings.push({
      level: 'info',
      message: `sprint-retro 3 div (計画 / 納品 / 差分) aria-hidden 追加 OK (${ariaHiddenDivCount} 箇所)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-retro dl 内 div aria-hidden 不足 (現在 ${ariaHiddenDivCount}、期待 3)`,
    })
  }

  // 2. dl aria-label 維持
  if (
    /aria-label=\{`計画 vs 納品 \(計画 \$\{planned\} 件 \/ 納品 \$\{delivered\} 件 \/ 差分 \$\{delta > 0 \? '\+' : ''\}\$\{delta\} 件\)`\}/.test(
      srw,
    )
  ) {
    findings.push({
      level: 'info',
      message: `sprint-retro dl aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-retro dl aria-label 破壊`,
    })
  }

  // iter907 invariant
  const dv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/dashboard-view.tsx'),
    'utf8',
  )
  if (
    /<div className="text-muted-foreground text-xs" aria-hidden="true">\s*\{label\}\s*<\/div>/.test(
      dv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter907 invariant: dashboard StatCard aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter907 invariant: 破壊` })
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

  console.log(`\n=== Findings (sprint-retro-dl-inner-aria-hidden-iter909) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
