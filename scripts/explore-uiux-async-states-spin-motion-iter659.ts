/**
 * Phase 6.15 loop iter 659 (mode-D Desktop a11y) —
 * shared async-states Loading component の Loader2 spinner を
 * prefers-reduced-motion 尊重化 (motion-safe:animate-spin)。
 *
 * 課題: async-states.tsx 行 32 の Loader2 icon は `animate-spin` で
 *   loading 中ずっと回転。aria-hidden で SR 不可視のため text "読み込み中..."
 *   と組合せで状態は伝わるが、`prefers-reduced-motion: reduce` を OS で
 *   設定したユーザにも強制回転 (vestibular disorder / 集中阻害)。
 *
 * fix (1 ファイル ~1 行差分):
 *   - `animate-spin` → `motion-safe:animate-spin`
 *   - prefers-reduced-motion: reduce 時は静止 icon、 text "読み込み中..." で
 *     loading 状態を伝える (role="status" + aria-live="polite" + 文字 text 既存)
 *
 * 中央 component なので 1 修正で全 view の loading state が一括 reduced-motion 尊重化。
 *
 * 検証: source-side regex assert + iter515-658 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const as = readFileSync(resolve(process.cwd(), 'src/components/shared/async-states.tsx'), 'utf8')

  // 1. motion-safe:animate-spin がある
  if (/Loader2 className="h-5 w-5 motion-safe:animate-spin"/.test(as)) {
    findings.push({ level: 'info', message: `Loading Loader2 motion-safe:animate-spin OK` })
  } else {
    findings.push({ level: 'warning', message: `Loading Loader2 motion-safe:animate-spin なし` })
  }

  // 2. 旧の生 animate-spin が残ってない
  if (/Loader2 className="h-5 w-5 animate-spin"/.test(as)) {
    findings.push({ level: 'warning', message: `生 animate-spin 残存 (motion-safe 化前)` })
  } else {
    findings.push({ level: 'info', message: `生 animate-spin 残存なし OK` })
  }

  // 3. role="status" + aria-live="polite" + text 既存 (= 状態は文字でも伝わる、motion-safe 解除後も a11y 担保)
  if (/role="status"\s*\n\s*aria-live="polite"/.test(as) && /読み込み中/.test(as)) {
    findings.push({ level: 'info', message: `role=status + 文字 text の代替経路 OK` })
  } else {
    findings.push({ level: 'warning', message: `代替経路 (role=status + 文字 text) 破壊` })
  }

  // 4. iter658 invariant: kanban decompose group-focus-within 維持
  const kv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/kanban-view.tsx'),
    'utf8',
  )
  if (/group-focus-within:opacity-100/.test(kv)) {
    findings.push({
      level: 'info',
      message: `iter658 invariant: kanban decompose focus-within 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter658 invariant: 破壊` })
  }

  // 5. iter656 invariant: decompose-proposals motion-safe 維持
  const dp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (/isAgentRunning \? 'motion-safe:animate-pulse' : ''/.test(dp)) {
    findings.push({
      level: 'info',
      message: `iter656 invariant: decompose pulse motion-safe 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter656 invariant: 破壊` })
  }

  // 6. iter657 invariant: 8 sub-page back-link arrow 維持 (sample: goals)
  const gp = readFileSync(
    resolve(process.cwd(), 'src/app/(workspace)/[workspaceId]/goals/page.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">← <\/span>Workspace/.test(gp)) {
    findings.push({ level: 'info', message: `iter657 invariant: goals back-link 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter657 invariant: 破壊` })
  }

  console.log(`\n=== Findings (async-states-spin-motion-iter659) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
