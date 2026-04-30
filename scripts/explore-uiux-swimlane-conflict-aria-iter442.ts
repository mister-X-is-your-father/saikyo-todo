/**
 * Phase 6.15 loop iter 442 (mode-D Desktop a11y) — Sprint Swimlane Disclosure
 * の lane bar 群が `role="img" aria-label="bar 数 N 件"` だけで競合
 * (conflicted) の有無を **色のみ (blue vs amber)** で伝えていた WCAG 1.4.1
 * 違反を解消、codify。
 *
 * 課題: src/components/workspace/sprint-swimlane-disclosure.tsx の lane bar:
 *   ```tsx
 *   <div role="img" aria-label={`bar 数 ${row.items.length} 件`}>
 *     {row.items.map((it) => (
 *       <span className={it.conflicted ? 'bg-amber-500' : 'bg-blue-500'} />
 *     ))}
 *   </div>
 *   ```
 *   - 色 (blue=normal / amber=conflicted) のみで競合を伝達 → WCAG 1.4.1 違反
 *   - SR ユーザは「bar 数 5 件」と聞き取るが、5 件中何件が競合かが伝わらず
 *     amber 強調 bar (= スケジュール衝突) を見逃す
 *
 * fix: 1 ファイル ~9 行差分 (コメント込み)。
 *   - aria-label の動的生成: `row.items.filter((it) => it.conflicted).length`
 *     を計算、`bar 数 N 件 (うち競合あり K 件)` の形式に。競合 0 件の時は
 *     冗長 suffix を省略 (= 旧文言維持)
 *
 * 機能追加なし、視覚 layout / 色 全て不変、shadcn 編集なし。
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

  const path = 'src/components/workspace/sprint-swimlane-disclosure.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // 1. 競合 count 計算 + aria-label dynamic
  if (/row\.items\.filter\(\(it\) => it\.conflicted\)\.length/.test(src)) {
    findings.push({
      level: 'info',
      message: `${path}: 競合 count 計算 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: 競合 count 計算 不在`,
    })
  }

  // 2. "うち競合あり" 文言が aria-label に含まれる
  if (/うち競合あり \$\{conflicted\} 件/.test(src)) {
    findings.push({
      level: 'info',
      message: `${path}: aria-label に "うち競合あり" 文言 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: aria-label に "うち競合あり" 不在`,
    })
  }

  // 3. 競合 0 件 fallback (`bar 数 ${...} 件`) 維持
  if (/`bar 数 \$\{row\.items\.length\} 件`/.test(src)) {
    findings.push({
      level: 'info',
      message: `${path}: 競合 0 件 fallback aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: 競合 0 件 fallback aria-label 消えた`,
    })
  }

  console.log(`\n=== Findings (swimlane-conflict-aria-iter442) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
