/**
 * Phase 6.15 loop iter 587 (mode-D Desktop a11y) —
 * gantt-view 表示切替 checkbox (依存線 / 完了済を隠す) に動的 aria-label を補完。
 *
 * 課題: gantt-view.tsx 行 346-363 の依存線 / 完了済を隠す checkbox は visible label
 *   ("依存線" / "完了済を隠す") が短く、現在の状態と「クリックでどうなるか」が SR
 *   ユーザに伝わらない。アクション結果を明示する動的 aria-label が必要。
 *
 * fix (1 ファイル ~6 行差分):
 *   - showDeps: aria-label={showDeps ? '依存線を表示中 (クリックで非表示)' : '依存線を表示する'}
 *   - hideDone: aria-label={hideDone ? '完了済を隠している (クリックで表示)' : '完了済を隠す (現在は表示中)'}
 *
 * iter530 (item-checkbox 動的 3-state) / iter561 (sprint-retro 差分 dd 動的) pattern
 * を gantt-view toggle に水平展開、状態 + 次アクション expose を統一。
 *
 * 検証: source-side regex assert + iter515-586 invariant cross-check。
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

  // 1. show-deps aria-label 動的化
  if (
    /aria-label=\{showDeps \? '依存線を表示中 \(クリックで非表示\)' : '依存線を表示する'\}/.test(gv)
  ) {
    findings.push({
      level: 'info',
      message: `gantt-view.tsx: show-deps aria-label 動的化 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `gantt-view.tsx: show-deps aria-label 動的化なし`,
    })
  }

  // 2. hide-done aria-label 動的化
  if (
    /hideDone \? '完了済を隠している \(クリックで表示\)' : '完了済を隠す \(現在は表示中\)'/.test(gv)
  ) {
    findings.push({
      level: 'info',
      message: `gantt-view.tsx: hide-done aria-label 動的化 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `gantt-view.tsx: hide-done aria-label 動的化なし`,
    })
  }

  // 3. iter586 invariant: proposal-edit-btn aria-label 維持
  const dpp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (
    /data-testid=\{`proposal-\$\{proposal\.id\}-edit-btn`\}\s*\n\s*aria-label=\{`提案「\$\{proposal\.title\}」を編集/.test(
      dpp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter586 invariant: proposal-edit-btn aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter586 invariant: 破壊`,
    })
  }

  // 4. iter515 anchor invariant
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (/aria-label=\{\s*importsOpen\s*\?\s*`Source「\$\{src\.name\}」の Pull 履歴/.test(ip)) {
    findings.push({
      level: 'info',
      message: `iter515 invariant: integrations-panel 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter515 invariant: 破壊`,
    })
  }

  console.log(`\n=== Findings (gantt-toggle-aria-iter587) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
