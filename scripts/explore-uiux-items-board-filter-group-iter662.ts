/**
 * Phase 6.15 loop iter 662 (mode-D Desktop a11y) —
 * items-board の filter container (MUST / ステータス / Sprint 絞り込み) に
 * role="group" + aria-label を追加 (SR で 絞り込みグループとして認識)。
 *
 * 課題: items-board.tsx 行 297 の filter container `<div>` は親 group "表示切替"
 *   の中にネストされた unlabeled wrapper。SR navigation で「表示切替」グループに
 *   入った後、view buttons と filter checkboxes / selects が混在 announcement される。
 *   filter は機能的に view 選択と独立 (絞り込み = 表示中の item 削減)、
 *   別 group として識別できる方が SR navigation で迷わない。
 *
 * fix (1 ファイル ~5 行差分):
 *   - filter container `<div>` に `role="group" aria-label="Item の絞り込み (MUST / ステータス / Sprint)"`
 *   - 親 group "表示切替" の中で sub-group として認識
 *
 * 検証: source-side regex assert + iter515-661 invariant cross-check。
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

  // 1. filter container に role="group" + aria-label
  if (
    /role="group"\s*\n\s*aria-label="Item の絞り込み \(MUST \/ ステータス \/ Sprint\)"/.test(ib)
  ) {
    findings.push({ level: 'info', message: `filter container role=group + aria-label OK` })
  } else {
    findings.push({ level: 'warning', message: `filter container role=group + aria-label なし` })
  }

  // 2. 親 group "表示切替" は維持されている (= 既存 view-switcher は破壊しない)
  if (/role="group"\s*\n\s*aria-label="表示切替"/.test(ib)) {
    findings.push({ level: 'info', message: `親 group "表示切替" 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `親 group "表示切替" 破壊` })
  }

  // 3. iter661 invariant: calendar-view 3 spinner motion-safe 維持
  const cv = readFileSync(
    resolve(process.cwd(), 'src/components/schedule/calendar-view.tsx'),
    'utf8',
  )
  if (/className="ml-2 inline h-3 w-3 motion-safe:animate-spin"/.test(cv)) {
    findings.push({ level: 'info', message: `iter661 invariant: calendar header spin 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter661 invariant: 破壊` })
  }

  // 4. iter659 invariant: async-states Loader2 維持
  const as = readFileSync(resolve(process.cwd(), 'src/components/shared/async-states.tsx'), 'utf8')
  if (/Loader2 className="h-5 w-5 motion-safe:animate-spin"/.test(as)) {
    findings.push({ level: 'info', message: `iter659 invariant: async-states 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter659 invariant: 破壊` })
  }

  // 5. iter658 invariant: kanban decompose group-focus-within 維持
  const kv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/kanban-view.tsx'),
    'utf8',
  )
  if (/group-focus-within:opacity-100/.test(kv)) {
    findings.push({ level: 'info', message: `iter658 invariant: kanban decompose 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter658 invariant: 破壊` })
  }

  // 6. iter657 invariant: 8 sub-page back-link arrow (sample: pdca)
  const pp = readFileSync(
    resolve(process.cwd(), 'src/app/(workspace)/[workspaceId]/pdca/page.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">← <\/span>Workspace/.test(pp)) {
    findings.push({ level: 'info', message: `iter657 invariant: pdca back-link 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter657 invariant: 破壊` })
  }

  console.log(`\n=== Findings (items-board-filter-group-iter662) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
