/**
 * Phase 6.15 loop iter1499 (mode-D = aria-label sweep continuation):
 * engineer-trigger-button.tsx の PR 自動起票 checkbox aria-label `(クリックで X)`
 * → `— クリックで X`。
 *
 * Bug: engineer-trigger-button.tsx の PR 自動起票 checkbox (line 71-75) の on/off
 * aria-label は `(クリックで OFF)` / `(クリックで ON)` で () 区切が残存。
 * iter1495 gantt 依存線 / iter1497 MUST 絞り込み toggle と同 「visible-prefix +
 * paren action hint」 古 pattern。`:` 接続子 + descriptive 句は維持しつつ、
 * 末尾の action hint paren のみ em-dash 化。
 *
 * 修正: 両 path の `( クリックで X )` を `— クリックで X` に統一、
 * iter1495 gantt / iter1497 items-board と同 punctuation 体系に。
 * 連動 migration: iter874 + iter876 の regression-guard regex も em-dash 形式に
 * 同 commit で更新 (検証目的 = on/off 両 state の完全 content 維持 guard で
 * 区切 punctuation は本質的 invariant ではないため)。
 *
 * (注: 同 commit で MUST 絞り込み 3 component (item-edit-dialog /
 * decompose-proposals-panel / template-items-editor) も似た pattern を持つが、
 * 3 component + 多数 regression test の sweep で scope 大きく、別 iter に分離)
 *
 * 経路 B: source-side regex assert + iter1495 gantt / iter1497 items-board
 * invariant cross-check。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-engineer-auto-pr-em-dash-iter1499.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function main(): void {
  const findings: Finding[] = []

  const etb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/engineer-trigger-button.tsx'),
    'utf8',
  )

  // 1. ON path の旧 paren 区切が消えている
  if (
    etb.includes("'PR 自動起票が ON: Engineer 起動時に Draft PR も作成される (クリックで OFF)'")
  ) {
    findings.push({
      level: 'error',
      message: 'engineer-trigger-button.tsx: ON path aria-label に () 区切が残存',
    })
  }
  // 2. ON path に em-dash 区切が入っている
  if (
    !etb.includes("'PR 自動起票が ON: Engineer 起動時に Draft PR も作成される — クリックで OFF'")
  ) {
    findings.push({
      level: 'error',
      message: 'engineer-trigger-button.tsx: ON path aria-label に em-dash 区切が無い',
    })
  }
  // 3. OFF path の旧 paren 区切が消えている
  if (
    etb.includes(
      "'PR 自動起票が OFF: Engineer 起動時は commit のみ、PR は人間が後で push (クリックで ON)'",
    )
  ) {
    findings.push({
      level: 'error',
      message: 'engineer-trigger-button.tsx: OFF path aria-label に () 区切が残存',
    })
  }
  // 4. OFF path に em-dash 区切が入っている
  if (
    !etb.includes(
      "'PR 自動起票が OFF: Engineer 起動時は commit のみ、PR は人間が後で push — クリックで ON'",
    )
  ) {
    findings.push({
      level: 'error',
      message: 'engineer-trigger-button.tsx: OFF path aria-label に em-dash 区切が無い',
    })
  }
  // 5. iter874 / iter876 regex migration (em-dash 形式に更新済み)
  const iter874 = readFileSync(
    resolve(process.cwd(), 'scripts/explore-uiux-checkbox-label-2-files-aria-hidden-iter874.ts'),
    'utf8',
  )
  if (
    iter874.includes(
      'PR 自動起票が ON: Engineer 起動時に Draft PR も作成される \\(クリックで OFF\\)',
    )
  ) {
    findings.push({
      level: 'error',
      message: 'iter874.ts: regex が旧 () 形式のまま (em-dash 移行漏れ)',
    })
  }
  const iter876 = readFileSync(
    resolve(process.cwd(), 'scripts/explore-uiux-engineer-auto-pr-aria-hidden-iter876.ts'),
    'utf8',
  )
  if (
    iter876.includes(
      'PR 自動起票が ON: Engineer 起動時に Draft PR も作成される \\(クリックで OFF\\)',
    )
  ) {
    findings.push({
      level: 'error',
      message: 'iter876.ts: regex が旧 () 形式のまま (em-dash 移行漏れ)',
    })
  }
  // 6. iter1495 gantt deps toggle invariant cross-check (回帰 guard)
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
  // 7. iter1497 items-board MUST toggle invariant cross-check (回帰 guard)
  const board = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  if (!board.includes("'MUST のみ表示中 — クリックで解除'")) {
    findings.push({
      level: 'error',
      message: 'items-board.tsx: iter1497 MUST toggle em-dash invariant 喪失',
    })
  }

  console.log(`\n=== Findings (iter1499 engineer auto-pr toggle em-dash) ===`)
  if (findings.length === 0)
    console.log(
      '(なし) — engineer auto-pr em-dash + iter874/876 regex migration + iter1495/1497 invariant OK',
    )
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()
