/**
 * Phase 6.15 loop iter 399 — items-board の MUST filter checkbox に
 * explicit id/htmlFor + 状態 aware aria-label を付与。
 *
 * 課題: src/components/workspace/items-board.tsx の MUST filter checkbox
 *   (line 290-296) は `<label>` で `<input>` を wrap する implicit association
 *   のみで:
 *   - id/htmlFor の explicit association 不在 (label click で focus は飛ぶが
 *     SR は implicit を完璧に解釈しない場合あり)
 *   - aria-label 不在 → SR は label text "MUST のみ" を読むが、現在の状態
 *     (チェック中 vs 未チェック) と「クリックで何が起きるか」を伝えない
 *
 * fix: src/components/workspace/items-board.tsx 1 file × 1 箇所 (約 5 line
 *   差替、機能追加なし、shadcn 編集なし)。
 *   - <label> に htmlFor="filter-must" 追加
 *   - <input> に id="filter-must" 追加 (explicit association)
 *   - <input> に aria-label を状態 aware で動的化:
 *     - must=true: "MUST のみ表示中 (クリックで解除)"
 *     - must=false: "MUST のみ表示に絞り込む"
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

  // 1. label htmlFor="filter-must"
  if (!/<label htmlFor="filter-must"/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: <label htmlFor="filter-must"> が無い`,
    })
  } else {
    findings.push({ level: 'info', message: 'label htmlFor OK' })
  }

  // 2. input id="filter-must"
  if (!/<input\s+id="filter-must"/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: <input id="filter-must"> が無い`,
    })
  } else {
    findings.push({ level: 'info', message: 'input id OK' })
  }

  // 3. aria-label 状態 aware
  if (
    !/aria-label=\{must \? 'MUST のみ表示中 \(クリックで解除\)' : 'MUST のみ表示に絞り込む'\}/.test(
      src,
    )
  ) {
    findings.push({
      level: 'warning',
      message: `${target}: input aria-label が状態 aware 動的化されていない`,
    })
  } else {
    findings.push({ level: 'info', message: 'input aria-label state-aware OK' })
  }

  // iter394-398 invariant 維持 (codebase 全 CardTitle role=heading)
  for (const f of [
    'src/components/template/templates-panel.tsx',
    'src/components/time-entry/top-items-by-time-chip.tsx',
  ]) {
    const s = readFileSync(resolve(process.cwd(), f), 'utf8')
    if (!/<CardTitle\s+className="[^"]+"\s+role="heading"/.test(s)) {
      findings.push({ level: 'warning', message: `${f}: iter394-398 CardTitle heading 消えた` })
    }
  }

  console.log(`\n=== Findings (must-filter-iter399) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
