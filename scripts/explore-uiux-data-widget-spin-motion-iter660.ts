/**
 * Phase 6.15 loop iter 660 (mode-D Desktop a11y) —
 * shared data-widget-card Loading Loader2 spinner を
 * prefers-reduced-motion 尊重化 (motion-safe:animate-spin)。
 *
 * 課題: data-widget-card.tsx 行 112 の Loader2 icon は `animate-spin` で
 *   loading 中ずっと回転。aria-hidden で SR 不可視のため text "読み込み中..."
 *   と組合せで状態は伝わるが、`prefers-reduced-motion: reduce` を設定したユーザにも
 *   強制回転 (vestibular disorder / 集中阻害)。dashboard 上の各 chart widget で
 *   同 component を使うので、複数 widget が同時 loading 中の page では
 *   spinner 多重回転で更に negatve impact。
 *
 * fix (1 ファイル ~1 行差分):
 *   - `animate-spin` → `motion-safe:animate-spin`
 *   - reduced-motion: reduce 時は静止 icon、role="status" + aria-live="polite" + 文字 text 既存
 *
 * iter659 (async-states.tsx) と同 pattern を data-widget-card.tsx に展開。
 *
 * 検証: source-side regex assert + iter515-659 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const dwc = readFileSync(
    resolve(process.cwd(), 'src/components/shared/data-widget-card.tsx'),
    'utf8',
  )

  // 1. motion-safe:animate-spin がある
  if (/Loader2 className="h-4 w-4 motion-safe:animate-spin"/.test(dwc)) {
    findings.push({ level: 'info', message: `data-widget Loader2 motion-safe:animate-spin OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `data-widget Loader2 motion-safe:animate-spin なし`,
    })
  }

  // 2. 旧の生 animate-spin が残ってない
  if (/Loader2 className="h-4 w-4 animate-spin"/.test(dwc)) {
    findings.push({ level: 'warning', message: `生 animate-spin 残存 (motion-safe 化前)` })
  } else {
    findings.push({ level: 'info', message: `生 animate-spin 残存なし OK` })
  }

  // 3. role="status" + 文字 text 既存 (= 代替経路)
  if (/role="status"/.test(dwc) && /読み込み中/.test(dwc)) {
    findings.push({ level: 'info', message: `role=status + 文字 text 代替経路 OK` })
  } else {
    findings.push({ level: 'warning', message: `代替経路 破壊` })
  }

  // 4. iter659 invariant: async-states Loader2 motion-safe 維持
  const as = readFileSync(resolve(process.cwd(), 'src/components/shared/async-states.tsx'), 'utf8')
  if (/Loader2 className="h-5 w-5 motion-safe:animate-spin"/.test(as)) {
    findings.push({ level: 'info', message: `iter659 invariant: async-states Loader2 維持 OK` })
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

  // 6. iter656 invariant: decompose-proposals motion-safe 維持
  const dp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (/isAgentRunning \? 'motion-safe:animate-pulse' : ''/.test(dp)) {
    findings.push({ level: 'info', message: `iter656 invariant: decompose pulse 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter656 invariant: 破壊` })
  }

  console.log(`\n=== Findings (data-widget-spin-motion-iter660) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
