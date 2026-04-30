/**
 * Phase 6.15 loop iter 400 — items-board の filter-status / filter-sprint
 * select の aria-label を状態 aware で動的化 (iter399 MUST checkbox pattern を
 * select にも展開)。
 *
 * 課題: iter399 で MUST filter checkbox の aria-label を状態 aware にしたが、
 *   隣接の filter-status と filter-sprint select は static "ステータスで
 *   絞り込み" / "Sprint で絞り込み" のまま。SR は現在 filter が active か
 *   どうか / どの値で絞り込まれているか が aria-label からは分からない。
 *
 * fix: src/components/workspace/items-board.tsx 1 file × 2 select (約 12 line
 *   差替、機能追加なし、shadcn 編集なし)。
 *   - filter-status select: statusFilter set 時 "ステータスで絞り込み中
 *     (現在: <値>)。「全ステータス」で解除"、未 set 時 "ステータスで絞り込み
 *     (todo / in_progress / done)"
 *   - filter-sprint select: 同 pattern
 *
 * iter399 + iter400 で items-board の 3 filter (must / status / sprint) が
 * 全て状態 aware aria-label に統一。
 *
 * 検証: source-side regex assert で codify。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const target = 'src/components/workspace/items-board.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  if (
    !/aria-label=\{\s*statusFilter\s*\?\s*`ステータスで絞り込み中 \(現在: \$\{statusFilter\}\)。「全ステータス」で解除`\s*:\s*'ステータスで絞り込み \(todo \/ in_progress \/ done\)'/.test(
      src,
    )
  ) {
    findings.push({
      level: 'warning',
      message: `${target}: filter-status select の aria-label が状態 aware 動的化されていない`,
    })
  } else {
    findings.push({ level: 'info', message: 'filter-status state-aware aria-label OK' })
  }

  if (
    !/aria-label=\{\s*sprintFilter\s*\?\s*`Sprint で絞り込み中 \(現在: \$\{sprintFilter\}\)。「全 Sprint」で解除`\s*:\s*'Sprint で絞り込み \(active \/ 未割当 \/ 個別 sprint\)'/.test(
      src,
    )
  ) {
    findings.push({
      level: 'warning',
      message: `${target}: filter-sprint select の aria-label が状態 aware 動的化されていない`,
    })
  } else {
    findings.push({ level: 'info', message: 'filter-sprint state-aware aria-label OK' })
  }

  // iter399 invariant: MUST checkbox state-aware aria-label
  if (
    !/aria-label=\{must \? 'MUST のみ表示中 \(クリックで解除\)' : 'MUST のみ表示に絞り込む'\}/.test(
      src,
    )
  ) {
    findings.push({
      level: 'warning',
      message: `${target}: iter399 MUST checkbox state-aware aria-label が消えた`,
    })
  }

  console.log(`\n=== Findings (filter-select-state-iter400) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
