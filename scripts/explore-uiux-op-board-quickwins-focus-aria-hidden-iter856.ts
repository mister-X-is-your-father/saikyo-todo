/**
 * Phase 6.15 loop iter 856 (mode-D Desktop a11y) —
 * operation-board-widget Quick wins / 集中ブロック list button visible {estimateMin}m + {it.title}
 * を aria-hidden span で wrap (一括 4 callsite).
 *
 * 課題: src/components/workspace/operation-board-widget.tsx の今日完了予測 tactic 2 section
 * (Quick wins / 集中ブロック) は button に aria-label 完全 content (例: `${title} を開く (見積 30分)`)
 * が付いているのに、内側 visible "30m" + {it.title} は aria-hidden 無し → SR ユーザは
 * aria-label を聞いた後 visible "30m" "{title}" も再度読み上げされて重複。
 * 加えて visible は "Nm" (英) で aria-label は "N分" (ja)、表記不一致が SR 経由で読まれる。
 *
 * fix (1 ファイル ~4 行差分):
 *   - Quick wins {it.estimateMin}m / {it.title} span → aria-hidden="true" 追加 (2 callsite)
 *   - 集中ブロック {it.estimateMin}m / {it.title} span → aria-hidden="true" 追加 (2 callsite)
 *   - aria-label 単独経路に統一、表記不一致 (Nm vs N分) も SR 経由で表面化しない
 *   - 計 4 callsite (2 tactic × 2 span each)
 *
 * 検証: source-side regex assert + iter735-855 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const op = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )

  // 1. Quick wins / 集中ブロック estimateMin span aria-hidden (2 callsite)
  const estMinAriaHidden =
    op.match(/text-muted-foreground text-\[10px\] tabular-nums"\n\s+aria-hidden="true"/g) ?? []
  if (estMinAriaHidden.length >= 2) {
    findings.push({
      level: 'info',
      message: `op-board estimateMin span aria-hidden 統合 OK (${estMinAriaHidden.length} 箇所)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `op-board estimateMin aria-hidden 未統合 (${estMinAriaHidden.length} 箇所)`,
    })
  }

  // 2. Quick wins / 集中ブロック {it.title} span aria-hidden (2 callsite)
  const titleAriaHidden = op.match(/<span className="truncate" aria-hidden="true">/g) ?? []
  if (titleAriaHidden.length >= 2) {
    findings.push({
      level: 'info',
      message: `op-board {it.title} span aria-hidden 統合 OK (${titleAriaHidden.length} 箇所)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `op-board {it.title} aria-hidden 未統合 (${titleAriaHidden.length} 箇所)`,
    })
  }

  // 3. button aria-label 維持 (regression 防止)
  if (
    /aria-label=\{`\$\{it\.title\} を開く \(見積 \$\{it\.estimateMin\}分\)`\}/.test(op) &&
    /aria-label=\{`\$\{it\.title\} を開く \(集中 \$\{it\.estimateMin\}分\)`\}/.test(op)
  ) {
    findings.push({
      level: 'info',
      message: `op-board button aria-label (見積 / 集中) 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `op-board button aria-label regression`,
    })
  }

  // 4. iter855 invariant: tag-picker / assignee-picker option aria-hidden 維持
  const tp = readFileSync(resolve(process.cwd(), 'src/components/workspace/tag-picker.tsx'), 'utf8')
  const ap = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/assignee-picker.tsx'),
    'utf8',
  )
  const apLabelHidden = ap.match(/<span aria-hidden="true">\{label\}<\/span>/g) ?? []
  if (/<span aria-hidden="true">\{t\.name\}<\/span>/.test(tp) && apLabelHidden.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter855 invariant: picker option aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter855 invariant: 破壊` })
  }

  // 5. iter853 invariant: bulk-clear aria-label + aria-hidden
  const bab = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/bulk-action-bar.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`解除: 選択 \$\{count\} 件を一括操作の対象から外す`\}/.test(bab) &&
    /<span aria-hidden="true">解除<\/span>/.test(bab)
  ) {
    findings.push({
      level: 'info',
      message: `iter853 invariant: bulk-clear aria-label + aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter853 invariant: 破壊` })
  }

  // 6. iter735 invariant: team-context-editor aria-keyshortcuts
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

  console.log(`\n=== Findings (op-board-quickwins-focus-aria-hidden-iter856) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
