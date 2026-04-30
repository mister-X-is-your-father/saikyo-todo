/**
 * Phase 6.15 loop iter 425 (mode-D Desktop a11y) — WorkflowGraphCanvas
 * (iter527 で着地した React Flow 視覚プレビュー) の `aria-label` が node 種類を
 * 含まず SR ユーザに graph の本質情報が伝わらない問題を修正、codify。
 *
 * 課題: src/components/workflow/workflow-graph-canvas.tsx の container は
 *   ```tsx
 *   <div role="img" aria-label={`Workflow graph: ${nodes.length} nodes, ${edges.length} edges`}>
 *   ```
 *   React Flow は SVG canvas 描画のため内部 node を AT に expose せず、SR
 *   ユーザは container aria-label のみが頼り。現状は count だけで「何種の
 *   node が混ざっているか」(noop / http / ai / slack / email / script /
 *   branch / parallel) が不明 → workflow の概要把握不能。
 *
 * fix: 1 ファイル ~10 行差分。
 *   - useMemo で `nodeTypeSummary` を計算 (node type 別件数を ASCII 昇順で集約、
 *     例: "ai 1, http 1, noop 2, slack 1")
 *   - aria-label に `(${nodeTypeSummary})` を埋込み →
 *     "Workflow graph: 5 nodes (ai 1, http 1, noop 2, slack 1), 4 edges"
 *   - 視覚 layout 不変、color / styling 全て既存維持
 *
 * 機能追加なし、shadcn 編集なし。typecheck / lint 緑。
 *
 * 検証: source-side regex assert で codify。runtime test (workflows-panel 描画)
 *   は workspace + workflow seed 必要なため省略。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const path = 'src/components/workflow/workflow-graph-canvas.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // 1. nodeTypeSummary useMemo (ASCII 昇順 sort + count 集約)
  const hasUseMemo = /const nodeTypeSummary = useMemo\(\(\) => \{/.test(src)
  const hasCount = /counts\[n\.type\] = \(counts\[n\.type\] \?\? 0\) \+ 1/.test(src)
  const hasSort = /\.sort\(\(\[a\], \[b\]\) => a\.localeCompare\(b\)\)/.test(src)
  const hasDeps = /\}, \[graph\.nodes\]\)/.test(src)
  if (hasUseMemo && hasCount && hasSort && hasDeps) {
    findings.push({ level: 'info', message: `${path}: nodeTypeSummary useMemo 実装 OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: nodeTypeSummary useMemo 不在 (memo=${hasUseMemo} count=${hasCount} sort=${hasSort} deps=${hasDeps})`,
    })
  }

  // 2. aria-label 配線 (container に nodeTypeSummary を埋込み)
  if (
    /aria-label=\{`Workflow graph: \$\{graph\.nodes\.length\} nodes \(\$\{nodeTypeSummary\}\), \$\{graph\.edges\.length\} edges`\}/.test(
      src,
    )
  ) {
    findings.push({ level: 'info', message: `${path}: aria-label に nodeTypeSummary 埋込み OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: aria-label 配線 不在` })
  }

  // 3. role="img" 維持 (container は atomic visual element)
  if (/role="img"\s+aria-label=\{`Workflow graph: /.test(src)) {
    findings.push({ level: 'info', message: `${path}: role="img" 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: role="img" 構造変化` })
  }

  console.log(`\n=== Findings (workflow-graph-aria-iter425) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
