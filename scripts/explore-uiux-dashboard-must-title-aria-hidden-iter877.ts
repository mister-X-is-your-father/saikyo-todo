/**
 * Phase 6.15 loop iter 877 (mode-D Desktop a11y) —
 * dashboard-view MUST item title button visible を aria-hidden span で wrap.
 *
 * 課題: src/components/workspace/dashboard-view.tsx 行 1397-1408 の MUST item title button は
 * aria-label "MUST「{item.title}」を編集" を完全含むのに、visible {item.title} は
 * aria-hidden 無し → SR ユーザに重複読み上げ。iter844-876 sweep の続編で
 * 1 callsite 対応、Dashboard MUST item 一覧の SR 経路整合性向上。
 *
 * fix (1 ファイル ~1 行差分):
 *   - visible {item.title} を <span aria-hidden="true"> で wrap
 *   - aria-label / data-testid / DoD 隣接 span 維持
 *
 * 検証: source-side regex assert + iter735-876 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const dv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/dashboard-view.tsx'),
    'utf8',
  )

  // 1. MUST item title visible aria-hidden span
  if (/<span aria-hidden="true">\{item\.title\}<\/span>/.test(dv)) {
    findings.push({
      level: 'info',
      message: `dashboard-must-title visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `dashboard-must-title visible aria-hidden 未統合` })
  }

  // 2. aria-label 維持
  if (/aria-label=\{`MUST「\$\{item\.title\}」を編集`\}/.test(dv)) {
    findings.push({
      level: 'info',
      message: `dashboard-must aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `dashboard-must aria-label regression` })
  }

  // 3. iter876 invariant: gantt-jump-today aria-hidden
  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')
  if (/<span aria-hidden="true">今日へジャンプ<\/span>/.test(gv)) {
    findings.push({
      level: 'info',
      message: `iter876 invariant: gantt-jump-today aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter876 invariant: 破壊` })
  }

  // 4. iter735 invariant
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

  console.log(`\n=== Findings (dashboard-must-title-aria-hidden-iter877) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
