/**
 * Phase 6.15 loop iter 931 (mode-D Desktop a11y) —
 * workspace-mode-selector Card region aria-label を CardTitle id + aria-labelledby に
 * 置換、region/heading 1 source 集約 (iter926/928/929/930 region/heading sweep 続編)。
 *
 * 経緯: Card region aria-label "作業モード設定 (現在: ${current})" と CardTitle visible
 *   "作業モード (workspace default)" + inner radiogroup aria-label "(現在: ${current})"
 *   の 3 重情報。CardTitle に id 付与 + Card aria-labelledby で source 1 つ集約、
 *   "現在" info は radiogroup aria-label に temple 保全 (SR でも radiogroup 入り時に同 announce)。
 *
 * 修正 (+8/-2 行、1 file):
 *   - Card aria-label → aria-labelledby="workspace-mode-selector-heading"
 *   - CardTitle に id="workspace-mode-selector-heading" 追加
 *   - radiogroup aria-label は維持 ("現在: label" 情報は radiogroup 経由で SR 取得可)
 *
 * 検証: source-side regex assert + iter735/930 invariant cross-check。
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

  // 1. Card aria-labelledby 化 OK
  if (/aria-labelledby="workspace-mode-selector-heading"/.test(wms)) {
    findings.push({
      level: 'info',
      message: `workspace-mode Card region aria-labelledby 化 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `workspace-mode Card region aria-labelledby 化 失敗`,
    })
  }

  // 2. CardTitle に id 付与 OK
  if (/id="workspace-mode-selector-heading"/.test(wms)) {
    findings.push({
      level: 'info',
      message: `workspace-mode CardTitle id 付与 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `workspace-mode CardTitle id 欠落`,
    })
  }

  // 3. 旧 Card aria-label 除去
  if (
    !/aria-label=\{`作業モード設定 \(現在: \$\{MODE_OPTIONS\.find\(\(o\) => o\.value === current\)\?\.label \?\? current\}\)`\}/.test(
      wms,
    )
  ) {
    findings.push({
      level: 'info',
      message: `workspace-mode 旧 Card aria-label 除去 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `workspace-mode 旧 Card aria-label 残存`,
    })
  }

  // 4. radiogroup aria-label 維持 (現在 info SR 経路保全)
  if (
    /role="radiogroup"\s*\n\s*aria-label=\{`workspace の default 作業モード \(現在: \$\{MODE_OPTIONS\.find\(\(o\) => o\.value === current\)\?\.label \?\? current\}\)`\}/.test(
      wms,
    )
  ) {
    findings.push({
      level: 'info',
      message: `workspace-mode radiogroup aria-label 維持 OK (現在 info SR 経路保全)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `workspace-mode radiogroup aria-label 破壊`,
    })
  }

  // iter930 invariant: data-widget-card useId
  const dwc = readFileSync(
    resolve(process.cwd(), 'src/components/shared/data-widget-card.tsx'),
    'utf8',
  )
  if (/useId/.test(dwc)) {
    findings.push({
      level: 'info',
      message: `iter930 invariant: data-widget-card useId 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter930 invariant: 破壊` })
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

  console.log(`\n=== Findings (workspace-mode-selector-region-aria-iter931) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
