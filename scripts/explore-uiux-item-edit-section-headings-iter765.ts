/**
 * Phase 6.15 loop iter 765 (mode-D Desktop a11y) —
 * item-edit-dialog 内の Sub tab 4 section header div に role="heading" + aria-level={3} を追加。
 * iter763 の decompose-proposals status header と同 pattern を Item 編集 dialog に展開。
 *
 * 課題: item-edit-dialog.tsx 行 433 / 448 / 469 / 482 の 4 section header div は
 *   text-sm font-semibold で見た目は heading だが、`<div>` のため SR の heading
 *   navigation で到達できない。各 section: 「AI で分解」「AI 担当の実行計画」
 *   「Engineer に実装させる」「タスクタイマー」 は Item 編集 dialog Sub tab で並ぶ
 *   独立 section だが SR は構造を把握できなかった。
 *
 * fix (1 ファイル ~4 箇所 / 8 行差分):
 *   - 4 section header div に `role="heading"` + `aria-level={3}` を追加
 *
 * 検証: source-side regex assert + iter735-763 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  const headingMatches = ied.match(
    /<div className="text-sm font-semibold" role="heading" aria-level=\{3\}>/g,
  )
  if (headingMatches && headingMatches.length >= 4) {
    findings.push({
      level: 'info',
      message: `item-edit-dialog 4 section header role="heading" + aria-level=3 追加 OK (${headingMatches.length} 箇所)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `item-edit-dialog section heading 追加 不完全 (${headingMatches?.length ?? 0} 箇所のみ)`,
    })
  }

  // iter763 invariant: decompose-proposals status header role="heading"
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
      message: `iter763 invariant: decompose-proposals status header heading 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter763 invariant: 破壊` })
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

  console.log(`\n=== Findings (item-edit-section-headings-iter765) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
