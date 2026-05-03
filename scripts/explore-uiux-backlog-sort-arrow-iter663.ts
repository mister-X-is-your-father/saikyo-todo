/**
 * Phase 6.15 loop iter 663 (mode-D Desktop a11y) —
 * backlog-view sort indicator (▲/▼) を aria-hidden で wrap
 * (SR が "up-pointing triangle" / "down-pointing triangle" 読み上げ抑止)。
 *
 * 課題: backlog-view.tsx 行 351-352 の `<th>` 内 sort 方向 indicator は
 *   `{{ asc: ' ▲', desc: ' ▼' }[isSorted] ?? ''}` を生 string で出力。
 *   `<th>` には aria-sort + aria-label "現在: 昇順/降順" 設定済 (= 状態は
 *   aria 経由で SR に伝達)、▲/▼ は purely visual indicator。
 *   一部 SR は inner text 全部読むため "上向き三角" / "下向き三角" と冗長読み上げ。
 *
 * fix (1 ファイル ~3 行差分):
 *   - sort 方向 symbol を `<span aria-hidden="true">…</span>` で wrap
 *   - aria-label / aria-sort で状態は伝達済 (代替経路 既存)
 *
 * iter178 / iter652-657 と同 wrap pattern を sort indicator に展開。
 *
 * 検証: source-side regex assert + iter515-662 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )

  // 1. sort indicator (▲/▼) が aria-hidden で wrap
  if (
    /<span aria-hidden="true">\s*\n\s*\{\{ asc: ' ▲', desc: ' ▼' \}\[h\.column\.getIsSorted\(\) as string\] \?\? ''\}\s*\n\s*<\/span>/.test(
      bv,
    )
  ) {
    findings.push({ level: 'info', message: `sort ▲/▼ aria-hidden wrap OK` })
  } else {
    findings.push({ level: 'warning', message: `sort ▲/▼ aria-hidden wrap なし` })
  }

  // 2. 旧の生 ▲/▼ 出力が残ってない (= aria-hidden の outside にない)
  if (/\{headerText\}\s*\n\s*\{\{ asc: ' ▲', desc: ' ▼' \}/.test(bv)) {
    findings.push({ level: 'warning', message: `生 ▲/▼ が aria-hidden 外に残存` })
  } else {
    findings.push({ level: 'info', message: `生 ▲/▼ aria-hidden 外残存なし OK` })
  }

  // 3. aria-sort / aria-label の代替経路 既存 (= SR で sort 状態が伝わる代替経路)
  if (/aria-sort=\{ariaSort\}/.test(bv) && /現在: \$\{sortLabel\}/.test(bv)) {
    findings.push({ level: 'info', message: `aria-sort + aria-label 代替経路 OK` })
  } else {
    findings.push({ level: 'warning', message: `代替経路 (aria-sort + aria-label) 破壊` })
  }

  // 4. iter662 invariant: items-board filter group 維持
  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  if (/role="group"\s*\n\s*aria-label="Item の絞り込み/.test(ib)) {
    findings.push({ level: 'info', message: `iter662 invariant: filter group 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter662 invariant: 破壊` })
  }

  // 5. iter661 invariant: calendar-view spinner motion-safe 維持
  const cv = readFileSync(
    resolve(process.cwd(), 'src/components/schedule/calendar-view.tsx'),
    'utf8',
  )
  if (/className="ml-2 inline h-3 w-3 motion-safe:animate-spin"/.test(cv)) {
    findings.push({ level: 'info', message: `iter661 invariant: calendar 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter661 invariant: 破壊` })
  }

  // 6. iter658 invariant: kanban decompose 維持
  const kv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/kanban-view.tsx'),
    'utf8',
  )
  if (/group-focus-within:opacity-100/.test(kv)) {
    findings.push({ level: 'info', message: `iter658 invariant: kanban decompose 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter658 invariant: 破壊` })
  }

  console.log(`\n=== Findings (backlog-sort-arrow-iter663) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
