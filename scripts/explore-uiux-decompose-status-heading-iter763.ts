/**
 * Phase 6.15 loop iter 763 (mode-D Desktop a11y) —
 * decompose-proposals-panel の status header div に role="heading" + aria-level={3} を追加。
 *
 * 課題: decompose-proposals-panel.tsx 行 127-139 の status header div
 *   ("AI 分解の提案 (N)" / "Researcher が分解中…" / "提案が出ませんでした") は
 *   text-sm font-semibold で見た目は heading だが、`<div>` のため SR の heading
 *   navigation (h shortcut) で到達できない。Item edit dialog → 子タスク tab で
 *   この AI 分解 section に直行できる手段がなかった。
 *
 * fix (1 ファイル ~5 行差分):
 *   - status header div に `role="heading"` + `aria-level={3}` を追加
 *
 * 検証: source-side regex assert + iter735-761 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const dpp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (
    /<div\s*\n\s*className="flex items-center gap-1\.5 text-sm font-semibold"\s*\n\s*role="heading"\s*\n\s*aria-level=\{3\}\s*\n\s*>/.test(
      dpp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `decompose-proposals status header div role="heading" + aria-level=3 追加 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `decompose-proposals status header div role="heading" 追加 不完全`,
    })
  }

  // iter756 invariant: decompose-proposals empty state
  if (
    /data-testid="proposals-empty-msg"\s*\n\s*role="status"\s*\n\s*aria-live="polite"/.test(dpp)
  ) {
    findings.push({
      level: 'info',
      message: `iter756 invariant: decompose-proposals empty state aria-live 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter756 invariant: 破壊` })
  }

  // iter759 race invariant: workspace-mode-selector
  const wms = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/workspace-mode-selector.tsx'),
    'utf8',
  )
  if (
    /role="region"\s*\n\s*aria-label=\{`作業モード設定 \(現在: \$\{MODE_OPTIONS\.find\(\(o\) => o\.value === current\)\?\.label \?\? current\}\)`\}/.test(
      wms,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter759-race invariant: workspace-mode-selector Card region 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter759-race invariant: 破壊` })
  }

  // iter752 invariant: backlog-view empty state
  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )
  if (/role="status"\s*\n\s*aria-live="polite"/.test(bv)) {
    findings.push({
      level: 'info',
      message: `iter752 invariant: backlog-view empty state aria-live 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter752 invariant: 破壊` })
  }

  // iter735 invariant: team-context-editor
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

  console.log(`\n=== Findings (decompose-status-heading-iter763) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
