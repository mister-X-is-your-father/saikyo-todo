/**
 * Phase 6.15 loop iter 908 (mode-D Desktop a11y) —
 * sprint-retro-widget の dd 差分 ({delta}) visible に aria-hidden span 追加、
 * dd aria-label "納品 - 計画 ${delta}" 単独経路に統一。
 *
 * 経緯: iter906-907 chip aria-hidden sweep の続編 (dl/dt/dd + aria-label dt/dd pattern)。
 *   sprint-retro-widget の 差分 dd は aria-label "納品 - 計画 ${delta} 件 (未達/超過達成)"
 *   完全 content を持つが、内側 visible {delta > 0 ? '+' : ''}{delta} は aria-hidden 無し
 *   → SR が aria-label と visible を二重読み上げ。
 *
 * 修正: 内側 visible を <span aria-hidden="true"> で wrap、aria-label 単独経路に統一。
 *
 * 検証: source-side regex assert + iter735/843/849-907 invariant cross-check。
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

  // 1. 差分 dd 内 visible aria-hidden
  if (/<span aria-hidden="true">\s*\{delta > 0 \? '\+' : ''\}\s*\{delta\}\s*<\/span>/.test(srw)) {
    findings.push({
      level: 'info',
      message: `sprint-retro 差分 dd visible aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-retro 差分 dd visible aria-hidden 未統合`,
    })
  }

  // 2. dd aria-label 3 状態維持
  if (
    /納品 - 計画 \$\{delta\} 件 \(未達\)/.test(srw) &&
    /納品 - 計画 \+\$\{delta\} 件 \(超過達成\)/.test(srw) &&
    /'納品 = 計画 \(差分なし\)'/.test(srw)
  ) {
    findings.push({
      level: 'info',
      message: `sprint-retro 差分 dd aria-label 3 状態 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-retro 差分 dd aria-label 破壊`,
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

  console.log(`\n=== Findings (sprint-retro-delta-aria-hidden-iter908) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
