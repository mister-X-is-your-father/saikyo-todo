/**
 * Phase 6.15 loop iter 690 (mode-D Desktop a11y) —
 * kanban-view 空 column の「ここにドロップ」 empty state に role=status + aria-live=polite 追加
 * (iter666-670 sweep の続き、kanban 列毎の droppable empty 通知)。
 *
 * 課題: kanban-view.tsx 行 258-261 の空 column empty state `<div>` (`ここにドロップ`) は
 *   visible text のみで role / aria-live 無し。iter161 / iter177 / iter666 / iter667 / iter668 / iter669 / iter670
 *   で確立した「empty state = role=status + aria-live=polite」 pattern が当 component の
 *   kanban column empty で漏れていた。SR ユーザは Kanban view で空 column の存在 + drop target を
 *   active 通知されない。
 *
 * fix (1 ファイル ~5 行差分):
 *   - empty `<div>` に `role="status"` + `aria-live="polite"`
 *
 * 検証: source-side regex assert + iter515-689 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const kv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/kanban-view.tsx'),
    'utf8',
  )

  // 1. kanban empty に role=status + aria-live
  if (
    /<div\s*\n\s*className="text-muted-foreground rounded border border-dashed px-2 py-4 text-center text-xs"\s*\n\s*role="status"\s*\n\s*aria-live="polite"\s*\n\s*>\s*\n\s*ここにドロップ/.test(
      kv,
    )
  ) {
    findings.push({ level: 'info', message: `kanban empty role=status + aria-live OK` })
  } else {
    findings.push({ level: 'warning', message: `kanban empty role=status + aria-live なし` })
  }

  // 2. iter689 invariant: bulk-count role=status 維持
  const bb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/bulk-action-bar.tsx'),
    'utf8',
  )
  if (
    /<span\s*\n\s*className="text-sm font-medium"\s*\n\s*role="status"\s*\n\s*aria-live="polite"\s*\n\s*aria-atomic="true"\s*\n\s*data-testid="bulk-count"/.test(
      bb,
    )
  ) {
    findings.push({ level: 'info', message: `iter689 invariant: bulk-count 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter689 invariant: 破壊` })
  }

  // 3. iter688 invariant: 日次 aria 維持
  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  if (/aria-label="日次レビュー画面 \(個人 期間 = 今日\)"/.test(ib)) {
    findings.push({ level: 'info', message: `iter688 invariant: 日次 aria 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter688 invariant: 破壊` })
  }

  // 4. iter658 invariant: kanban decompose group-focus-within 維持 (= kanban-view 同 file)
  if (/group-focus-within:opacity-100/.test(kv)) {
    findings.push({ level: 'info', message: `iter658 invariant: kanban decompose 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter658 invariant: 破壊` })
  }

  // 5. iter668 invariant: deps-empty 維持
  const idp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-dependencies-panel.tsx'),
    'utf8',
  )
  if (
    /<p className="text-muted-foreground text-xs" role="status" aria-live="polite">\s*\n\s*\{emptyText\}/.test(
      idp,
    )
  ) {
    findings.push({ level: 'info', message: `iter668 invariant: deps-empty 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter668 invariant: 破壊` })
  }

  console.log(`\n=== Findings (kanban-empty-drop-iter690) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
