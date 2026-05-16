/**
 * Phase 6.15 loop iter 872 (mode-D Desktop a11y) —
 * gantt-view の filter checkbox label 2 種 (依存線 / 完了済を隠す) visible text を
 * <span aria-hidden="true"> で wrap し、input aria-label 単独経路に統一。
 *
 * 経緯: iter871 で items-board の MUST のみ filter checkbox label を span aria-hidden 化済
 *   → gantt-view の同 pattern (依存線 / 完了済を隠す) を sweep。
 *   いずれも input に aria-label 完全 content (2 状態) を持つが label visible aria-hidden 無し。
 *
 * 修正: 2 箇所一括で visible text を <span aria-hidden="true"> で wrap、input aria-label 単独経路に統一。
 *
 * 検証: source-side regex assert + iter735/843/849-871 invariant cross-check。
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

  // 1. 依存線 label visible aria-hidden
  if (/<span aria-hidden="true">依存線<\/span>/.test(gv)) {
    findings.push({
      level: 'info',
      message: `gantt-view show-deps label visible "依存線" aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `gantt-view show-deps label aria-hidden 未統合`,
    })
  }

  // 2. 完了済を隠す label visible aria-hidden
  if (/<span aria-hidden="true">完了済を隠す<\/span>/.test(gv)) {
    findings.push({
      level: 'info',
      message: `gantt-view hide-done label visible "完了済を隠す" aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `gantt-view hide-done label aria-hidden 未統合`,
    })
  }

  // 3. input aria-label 完全 content 維持 (両 input 各 2 状態)
  if (
    /aria-label=\{showDeps \? '依存線を表示中 \(クリックで非表示\)' : '依存線を表示する'\}/.test(
      gv,
    ) &&
    /hideDone \? '完了済を隠している \(クリックで表示\)' : '完了済を隠す \(現在は表示中\)'/.test(gv)
  ) {
    findings.push({
      level: 'info',
      message: `gantt-view filter input aria-label 4 状態 完全 content 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `gantt-view filter input aria-label 破壊`,
    })
  }

  // 4. data-testid + label 構造維持
  if (
    /data-testid="gantt-show-deps-toggle"/.test(gv) &&
    /data-testid="gantt-hide-done-toggle"/.test(gv) &&
    /data-testid="gantt-jump-today"/.test(gv)
  ) {
    findings.push({
      level: 'info',
      message: `gantt-view filter + jump-today data-testid 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `gantt-view data-testid 破壊`,
    })
  }

  // iter868 invariant: gantt-view jump-today aria-hidden
  if (/<span aria-hidden="true">今日へジャンプ<\/span>/.test(gv)) {
    findings.push({
      level: 'info',
      message: `iter868 invariant: gantt-view jump-today aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter868 invariant: 破壊` })
  }

  // iter871 invariant: items-board MUST filter label
  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">MUST のみ<\/span>/.test(ib)) {
    findings.push({
      level: 'info',
      message: `iter871 invariant: items-board MUST のみ label aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter871 invariant: 破壊` })
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

  console.log(`\n=== Findings (gantt-filter-labels-aria-hidden-iter872) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
