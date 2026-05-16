/**
 * Phase 6.15 loop iter 874 (mode-D Desktop a11y) —
 * gantt-view: 2 filter toggle checkbox label visible text を aria-hidden span
 * で wrap (一括)。
 *
 * 課題: src/components/workspace/gantt-view.tsx の 2 toggle checkbox は
 *   aria-label が完全 content (visible text を含む + 状態) を持つのに、
 *   <label> 内の visible text は aria-hidden 無し → SR 重複読み上げ:
 *     1. gantt-show-deps-toggle: aria-label "依存線を表示中..." / "依存線を表示する"
 *        + visible "依存線"
 *     2. gantt-hide-done-toggle: aria-label "完了済を隠している (...)" / "完了済を隠す (...)"
 *        + visible "完了済を隠す"
 *   iter873 の filter MUST checkbox と同 pattern (input aria-label override + label
 *   wraps input + visible label text)。
 *
 * fix (1 file ~2 spot):
 *   - 各 visible text を <span aria-hidden="true"> で wrap、aria-label 単独経路
 *   - 機能不変、視覚 layout 不変、shadcn 編集なし
 *
 * 検証: source-side regex assert + iter735/872/873 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')
  if (/<span aria-hidden="true">依存線<\/span>/.test(gv)) {
    findings.push({
      level: 'info',
      message: `gantt-show-deps visible "依存線" aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `gantt-show-deps visible "依存線" aria-hidden 未統合`,
    })
  }
  if (/<span aria-hidden="true">完了済を隠す<\/span>/.test(gv)) {
    findings.push({
      level: 'info',
      message: `gantt-hide-done visible "完了済を隠す" aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `gantt-hide-done visible "完了済を隠す" aria-hidden 未統合`,
    })
  }
  if (
    /aria-label=\{showDeps \? '依存線を表示中 \(クリックで非表示\)' : '依存線を表示する'\}/.test(
      gv,
    ) &&
    /aria-label=\{[\s\S]+?'完了済を隠している \(クリックで表示\)' : '完了済を隠す \(現在は表示中\)'/.test(
      gv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `gantt 2 toggle aria-label (active/inactive 両 state) 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `gantt 2 toggle aria-label 破壊` })
  }
  // <label> 関連付け維持
  if (
    /data-testid="gantt-show-deps-toggle"/.test(gv) &&
    /data-testid="gantt-hide-done-toggle"/.test(gv)
  ) {
    findings.push({
      level: 'info',
      message: `gantt 2 toggle data-testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `gantt 2 toggle data-testid 破壊` })
  }

  // iter873 invariant: items-board filter MUST aria-hidden
  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">MUST のみ<\/span>/.test(ib)) {
    findings.push({
      level: 'info',
      message: `iter873 invariant: items-board filter MUST aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter873 invariant: 破壊` })
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

  console.log(`\n=== Findings (gantt-filter-toggles-aria-hidden-iter874) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
