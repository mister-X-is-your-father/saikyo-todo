/**
 * Phase 6.15 loop iter 877 (mode-D Desktop a11y) —
 * SeverityChip shared substrate: inner visible {label} + {delta} span を
 * aria-hidden 化 (shared component 改善、全 caller 8 file に波及)。
 *
 * 課題: src/components/shared/severity-chip.tsx は workspace 全体で 8 caller を
 *   持つ shared chip。parent (button or role=img) に aria-label (= ariaLabel ??
 *   label) が完全 content を持つのに、inner {label} + {delta} span は
 *   aria-hidden 無し → SR ユーザは aria-label を聞いた後、visible label / delta
 *   も別途読み上げされる重複。
 *   特に SeverityChip は cycle-check-stats / sprint-risk-board / ai-handoff-phase-chip
 *   等の widget で多用される hot-path で、修正効果は workspace 全体に波及。
 *
 * fix (1 file ~2 spot):
 *   - 内側 label span に aria-hidden="true" 追加
 *   - 内側 delta span に aria-hidden="true" 追加 (delta が undefined でない時)
 *   - icon span は既存 aria-hidden 維持
 *   - parent aria-label は変更なし、機能不変、視覚 layout 不変、shadcn 編集なし
 *   - iter800-876 sweep の shared component 強化版
 *
 * 検証: source-side regex assert + iter735/875/876 invariant cross-check。
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

  if (
    /<span className="truncate font-medium" aria-hidden="true">\s*\{label\}\s*<\/span>/.test(sc)
  ) {
    findings.push({
      level: 'info',
      message: `SeverityChip inner label span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `SeverityChip inner label span aria-hidden 未統合`,
    })
  }
  if (
    /<span[\s\S]+?className="shrink-0 text-\[10px\] font-semibold opacity-90"[\s\S]+?aria-hidden="true"[\s\S]+?>\s*\{delta\}\s*<\/span>/.test(
      sc,
    )
  ) {
    findings.push({
      level: 'info',
      message: `SeverityChip inner delta span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `SeverityChip inner delta span aria-hidden 未統合`,
    })
  }
  // icon aria-hidden 維持
  if (/<span aria-hidden="true">\{icon\}<\/span>/.test(sc)) {
    findings.push({
      level: 'info',
      message: `SeverityChip icon span aria-hidden 維持 OK (既存)`,
    })
  } else {
    findings.push({ level: 'warning', message: `SeverityChip icon aria-hidden 破壊` })
  }
  // aria-label (ariaLabel ?? label) 維持
  if (/aria-label=\{ariaLabel \?\? label\}/.test(sc)) {
    findings.push({
      level: 'info',
      message: `SeverityChip aria-label (ariaLabel ?? label) 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `SeverityChip aria-label fallback 破壊` })
  }
  // role="img" / button 両 path 維持
  if (/role="img"/.test(sc) && /<button/.test(sc)) {
    findings.push({
      level: 'info',
      message: `SeverityChip role="img" / <button> 両 path 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `SeverityChip role / path 破壊` })
  }

  // iter876 invariant: engineer-trigger-button PR 自動起票 aria-hidden
  const etb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/engineer-trigger-button.tsx'),
    'utf8',
  )
  if (
    /<span className="text-muted-foreground" aria-hidden="true">\s*PR 自動起票\s*<\/span>/.test(etb)
  ) {
    findings.push({
      level: 'info',
      message: `iter876 invariant: engineer PR 自動起票 aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter876 invariant: 破壊` })
  }

  // iter875 invariant: format-duration boundary test の存在
  const fdt = readFileSync(resolve(process.cwd(), 'src/lib/format-duration.test.ts'), 'utf8')
  if (
    /'境界 boundary: round が 60 倍数を跨ぐと "Hh" に格上げ \(59\.6 → 1h、59\.4 → 59min\)'/.test(
      fdt,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter875 invariant: format-duration boundary test 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter875 invariant: 破壊` })
  }

  // iter735 invariant: team-context-editor aria-keyshortcuts
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

  console.log(`\n=== Findings (severity-chip-aria-hidden-iter877) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
