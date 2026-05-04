/**
 * Phase 6.15 loop iter 759 (mode-D Desktop a11y) —
 * workspace-mode-selector Card に role="region" + 動的 aria-label を追加。
 * iter750-756 の region/landmark sweep の続き。
 *
 * 課題: workspace-mode-selector.tsx 行 102 の `<Card data-testid="workspace-mode-selector">` は
 *   role / aria-label が無く、SR の landmark navigation で「作業モード設定」 widget に
 *   到達できない。CardTitle (h2) は heading として navigate できるが landmark は別 channel。
 *   iter750-756 で他 widget Card は region 化したので mode-selector も揃える。
 *   radiogroup (内側) は別途 aria-label 持っているが、Card 全体としての landmark 名が
 *   「現在何モード」 を含んでいなかった。
 *
 * fix (1 ファイル ~5 行差分):
 *   - Card に `role="region"` + `aria-label={`作業モード設定 (現在: ${currentLabel})`}` 追加
 *
 * 検証: source-side regex assert + iter735-756 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const wms = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/workspace-mode-selector.tsx'),
    'utf8',
  )
  const hasRegion =
    /role="region"\s*\n\s*aria-label=\{`作業モード設定 \(現在: \$\{MODE_OPTIONS\.find\(\(o\) => o\.value === current\)\?\.label \?\? current\}\)`\}/.test(
      wms,
    )
  if (hasRegion) {
    findings.push({
      level: 'info',
      message: `workspace-mode-selector Card region + aria-label 追加 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `workspace-mode-selector Card region + aria-label 追加 不完全`,
    })
  }

  // iter756 invariant: decompose-proposals empty state
  const dpp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
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

  // iter755 invariant: diff-summary-bar
  const dsb = readFileSync(
    resolve(process.cwd(), 'src/components/schedule/diff-summary-bar.tsx'),
    'utf8',
  )
  if (
    /<div className="text-muted-foreground py-2 text-xs" role="status" aria-live="polite">/.test(
      dsb,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter755 invariant: diff-summary-bar aria-live 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter755 invariant: 破壊` })
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

  console.log(`\n=== Findings (mode-selector-region-iter759) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
