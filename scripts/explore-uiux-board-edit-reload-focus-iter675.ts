/**
 * Phase 6.15 loop iter 675 (mode-D Desktop a11y) —
 * board-empty-quick-add (items-board) / item-edit-reload (item-edit-dialog conflict banner)
 * の plain button に focus-visible ring 追加 (iter671-674 sweep 継続)。
 *
 * 課題:
 *   - items-board.tsx 行 430 の board-empty-quick-add (全 view 共通の board empty CTA) は
 *     focus-visible 無し
 *   - item-edit-dialog.tsx 行 301 の item-edit-reload (conflict banner 内、サーバ最新値で再読み込み)
 *     は focus-visible 無し
 *
 * fix (2 ファイル ~2 行差分):
 *   - 各 className に `focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none`
 *
 * 検証: source-side regex assert + iter515-674 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )

  // 1. board-empty-quick-add に focus-visible
  if (
    /text-primary hover:bg-muted focus-visible:ring-ring mt-2 inline-flex min-h-11 items-center rounded border px-3 py-1\.5 text-xs hover:underline focus-visible:ring-2 focus-visible:outline-none/.test(
      ib,
    )
  ) {
    findings.push({ level: 'info', message: `board-empty-quick-add focus-visible OK` })
  } else {
    findings.push({ level: 'warning', message: `board-empty-quick-add focus-visible なし` })
  }

  // 2. item-edit-reload に focus-visible
  if (
    /focus-visible:ring-ring relative shrink-0 rounded border border-amber-600\/50 px-2 py-1 text-\[11px\] font-medium before:absolute before:-inset-3 before:content-\[''\] hover:bg-amber-600\/20 focus-visible:ring-2 focus-visible:outline-none/.test(
      ied,
    )
  ) {
    findings.push({ level: 'info', message: `item-edit-reload focus-visible OK` })
  } else {
    findings.push({ level: 'warning', message: `item-edit-reload focus-visible なし` })
  }

  // 3. iter674 invariant: today-title 維持
  const tv = readFileSync(resolve(process.cwd(), 'src/components/workspace/today-view.tsx'), 'utf8')
  if (
    /hover:text-primary focus-visible:ring-ring truncate rounded text-left font-medium hover:underline focus-visible:ring-2 focus-visible:outline-none/.test(
      tv,
    )
  ) {
    findings.push({ level: 'info', message: `iter674 invariant: today-title 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter674 invariant: 破壊` })
  }

  // 4. iter673 invariant: goal-toggle 維持
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (
    /hover:bg-muted focus-visible:ring-ring mt-0\.5 rounded p-1 focus-visible:ring-2 focus-visible:outline-none/.test(
      gp,
    )
  ) {
    findings.push({ level: 'info', message: `iter673 invariant: goal-toggle 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter673 invariant: 破壊` })
  }

  // 5. iter662 invariant: items-board filter group 維持 (= items-board 同 file 編集で破壊なし)
  if (/role="group"\s*\n\s*aria-label="Item の絞り込み/.test(ib)) {
    findings.push({ level: 'info', message: `iter662 invariant: filter group 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter662 invariant: 破壊` })
  }

  // 6. iter178 invariant: 🧠 emoji 維持 (= item-edit-dialog 同 file 編集で破壊なし)
  if (/<span aria-hidden="true">🧠 <\/span>AI で分解/.test(ied)) {
    findings.push({ level: 'info', message: `iter178 invariant: 🧠 emoji 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter178 invariant: 破壊` })
  }

  console.log(`\n=== Findings (board-edit-reload-focus-iter675) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
