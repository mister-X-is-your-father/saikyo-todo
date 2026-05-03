/**
 * Phase 6.15 loop iter 656 (mode-D Desktop a11y) —
 * decompose-proposals-panel Sparkles icon pulse 動を prefers-reduced-motion 尊重化
 * (motion-safe: variant で wrap)。
 *
 * 課題: decompose-proposals-panel.tsx 行 130 の `<Sparkles>` icon は
 *   `isAgentRunning ? 'animate-pulse' : ''` で agent 実行中ずっと点滅。
 *   text "Researcher が分解中…" だけで状態は分かるので pulse は decorative
 *   だが、`prefers-reduced-motion: reduce` を OS で設定したユーザにも強制点滅
 *   していた (vestibular disorder / 集中阻害)。
 *
 * fix (1 ファイル ~1 行差分):
 *   - `animate-pulse` → `motion-safe:animate-pulse`
 *   - prefers-reduced-motion: no-preference の時のみ点滅、reduce 時は静止
 *
 * 検証: source-side regex assert + iter515-655 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const dp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )

  // 1. motion-safe:animate-pulse がある
  if (/isAgentRunning \? 'motion-safe:animate-pulse' : ''/.test(dp)) {
    findings.push({ level: 'info', message: `Sparkles motion-safe:animate-pulse OK` })
  } else {
    findings.push({ level: 'warning', message: `Sparkles motion-safe:animate-pulse なし` })
  }

  // 2. 旧の生 animate-pulse が残ってない
  if (/isAgentRunning \? 'animate-pulse' : ''/.test(dp)) {
    findings.push({ level: 'warning', message: `生 animate-pulse 残存 (motion-safe 化前)` })
  } else {
    findings.push({ level: 'info', message: `生 animate-pulse 残存なし OK` })
  }

  // 3. iter655 invariant: subtasks-panel overDepth ⚠ 維持
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/subtasks-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">⚠ <\/span>深さ \{MAX_TREE_DEPTH\}/.test(sp)) {
    findings.push({ level: 'info', message: `iter655 invariant: subtasks overDepth ⚠ 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter655 invariant: 破壊` })
  }

  // 4. iter654 invariant: quick-add must-warn ⚠ 維持
  const qa = readFileSync(resolve(process.cwd(), 'src/components/workspace/quick-add.tsx'), 'utf8')
  if (/<span aria-hidden="true">⚠ <\/span>編集ダイアログで DoD を入れてください/.test(qa)) {
    findings.push({ level: 'info', message: `iter654 invariant: quick-add must-warn ⚠ 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter654 invariant: 破壊` })
  }

  // 5. iter653 invariant: weekly-insight ⭐ 維持
  const wi = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/weekly-insight-widget.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">⭐ <\/span>/.test(wi)) {
    findings.push({ level: 'info', message: `iter653 invariant: weekly-insight ⭐ 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter653 invariant: 破壊` })
  }

  // 6. iter652 invariant: op-board Quick wins 維持
  const ob = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">⚡ <\/span>Quick wins/.test(ob)) {
    findings.push({ level: 'info', message: `iter652 invariant: op-board Quick wins 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter652 invariant: 破壊` })
  }

  console.log(`\n=== Findings (decompose-pulse-motion-iter656) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
