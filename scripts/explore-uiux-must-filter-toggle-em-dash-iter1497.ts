/**
 * Phase 6.15 loop iter1497 (mode-D = aria-label sweep continuation): items-board.tsx の
 * MUST 絞り込み toggle checkbox aria-label `(クリックで解除)` → `— クリックで解除`。
 *
 * Bug: items-board.tsx の MUST 絞り込み toggle checkbox (line 351) の checked path
 * aria-label は `'MUST のみ表示中 (クリックで解除)'` で () 区切が残存。
 * iter1495 で gantt-view.tsx 依存線 toggle が同 pattern を em-dash に統一済、
 * 本 toggle も同じ「visible-prefix + paren ヒント」 古 pattern。
 *
 * 修正: checked path の `( クリックで解除 )` を `— クリックで解除` に統一、
 * iter1495 gantt deps toggle と byte-identical な punctuation 体系に。
 * unchecked path はシンプル文で paren 不要のため不変。
 *
 * iter1494 副 items-board view-switcher 9 button em-dash 統一 fix と隣接、
 * items-board.tsx の filter toolbar (MUST + sprint + status) の MUST toggle が
 * 同 file 内で view-switcher と punctuation 体系一致するように。
 *
 * 経路 B: source-side regex assert + iter1494 副 view-switcher / iter1495 gantt
 * invariant cross-check。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-must-filter-toggle-em-dash-iter1497.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function main(): void {
  const findings: Finding[] = []

  const board = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )

  // 1. checked path の旧 paren 区切が消えている
  if (board.includes("'MUST のみ表示中 (クリックで解除)'")) {
    findings.push({
      level: 'error',
      message: 'items-board.tsx: MUST toggle checked aria-label に () 区切が残存',
    })
  }
  // 2. checked path に em-dash 区切が入っている
  if (!board.includes("'MUST のみ表示中 — クリックで解除'")) {
    findings.push({
      level: 'error',
      message: 'items-board.tsx: MUST toggle checked aria-label に em-dash 区切が無い',
    })
  }
  // 3. unchecked path は不変 (シンプル文、paren 無い)
  if (!board.includes("'MUST のみ表示に絞り込む'")) {
    findings.push({
      level: 'error',
      message: 'items-board.tsx: MUST toggle unchecked aria-label 喪失',
    })
  }
  // 4. iter1495 gantt deps toggle invariant cross-check (回帰 guard)
  const gantt = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'),
    'utf8',
  )
  if (!gantt.includes("'依存線を表示中 — クリックで非表示'")) {
    findings.push({
      level: 'error',
      message: 'gantt-view.tsx: iter1495 依存線 toggle em-dash invariant 喪失',
    })
  }
  // 5. iter1494 副 view-switcher invariant cross-check (回帰 guard)
  if (!board.includes(' — ')) {
    findings.push({
      level: 'error',
      message: 'items-board.tsx: iter1494 副 view-switcher em-dash invariant 喪失',
    })
  }

  console.log(`\n=== Findings (iter1497 MUST filter toggle em-dash) ===`)
  if (findings.length === 0)
    console.log(
      '(なし) — MUST filter toggle em-dash + iter1495 gantt + iter1494 副 view-switcher invariant OK',
    )
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()
