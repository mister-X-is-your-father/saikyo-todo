/**
 * Phase 6.15 loop iter1495 (mode-D = aria-label sweep continuation): gantt-view.tsx の
 * 依存線 toggle checkbox aria-label `(クリックで非表示)` → `— クリックで非表示`。
 *
 * Bug: gantt-view.tsx 依存線 toggle checkbox (line 407) の checked path aria-label は
 *   `'依存線を表示中 (クリックで非表示)'`
 * で () 区切が残存。同 toolbar の hideDone toggle (line 426-427) は iter1199 で
 * 「visible-prefix + em-dash + 状態 + paren ヒント」 pattern に書き換え済みだが、
 * dependency 行は古い「visible-prefix + paren」 のまま (iter1093-1151 / iter1493 副 /
 * iter1494 の em-dash 統一 sweep からこぼれていた)。
 *
 * 修正: checked path の `( クリックで非表示 )` を `— クリックで非表示` に統一、
 * iter1199 hideDone と同 punctuation 体系 (unchecked path は単一文で paren 不要、
 * iter1199 不変)。
 *
 * 経路 B: source-side regex assert + iter1199 hideDone invariant cross-check。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-gantt-deps-toggle-em-dash-iter1495.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function main(): void {
  const findings: Finding[] = []

  const gantt = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'),
    'utf8',
  )

  // 1. checked path の旧 paren 区切が消えている
  if (gantt.includes("'依存線を表示中 (クリックで非表示)'")) {
    findings.push({
      level: 'error',
      message: 'gantt-view.tsx: 依存線 checked aria-label に () 区切が残存',
    })
  }
  // 2. checked path に em-dash 区切が入っている
  if (!gantt.includes("'依存線を表示中 — クリックで非表示'")) {
    findings.push({
      level: 'error',
      message: 'gantt-view.tsx: 依存線 checked aria-label に em-dash 区切が無い',
    })
  }
  // 3. unchecked path は不変 (シンプル文、paren 無い)
  if (!gantt.includes("'依存線を表示する'")) {
    findings.push({
      level: 'error',
      message: 'gantt-view.tsx: 依存線 unchecked aria-label 喪失',
    })
  }
  // 4. iter1199 hideDone invariant cross-check (回帰 guard)
  if (!gantt.includes("'完了済を隠す — 現在は隠している (クリックで表示に戻す)'")) {
    findings.push({
      level: 'error',
      message: 'gantt-view.tsx: iter1199 hideDone invariant 喪失',
    })
  }

  console.log(`\n=== Findings (iter1495 gantt deps toggle em-dash) ===`)
  if (findings.length === 0)
    console.log('(なし) — gantt deps toggle em-dash + iter1199 hideDone invariant OK')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()
