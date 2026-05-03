/**
 * Phase 6.15 loop iter 671 (mode-D Desktop a11y) —
 * shared severity-chip clickable button に focus-visible ring を追加
 * (WCAG 2.4.7 Focus Visible 準拠、keyboard ユーザに focus indicator を可視化)。
 *
 * 課題: severity-chip.tsx 行 70-79 の clickable button (onClick あり) は
 *   focus-visible:ring-* 等の focus indicator が無い。Tailwind 4 の reset で
 *   browser default の focus ring が無効化されているため、keyboard ユーザは
 *   Tab で focus を当ててもどの chip に居るか視覚的に分からない (WCAG 2.4.7 違反)。
 *
 * fix (1 ファイル ~5 行差分):
 *   - className に `focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none` を追加
 *   - Tailwind の `cn` で baseCls + before: pseudo + focus-visible: を結合
 *
 * iter658 (kanban decompose group-focus-within) と同 a11y 軸 (focus visibility)。
 *
 * 検証: source-side regex assert + iter515-670 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const sc = readFileSync(resolve(process.cwd(), 'src/components/shared/severity-chip.tsx'), 'utf8')

  // 1. focus-visible:ring が button に追加されている
  if (/'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none'/.test(sc)) {
    findings.push({ level: 'info', message: `severity-chip focus-visible ring OK` })
  } else {
    findings.push({ level: 'warning', message: `severity-chip focus-visible ring なし` })
  }

  // 2. baseCls / before: pseudo / aria-label invariant 維持 (= 既存機能破壊なし)
  if (
    /baseCls,\s*\n?\s*"relative before:absolute before:-inset-3 before:content-\[''\]"/.test(sc)
  ) {
    findings.push({ level: 'info', message: `before: pseudo + baseCls 既存維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `before: pseudo / baseCls 破壊` })
  }

  // 3. iter670 invariant: top-items-empty 維持
  const tic = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/top-items-by-time-chip.tsx'),
    'utf8',
  )
  if (
    /role="status"\s*\n\s*aria-live="polite"\s*\n\s*data-testid="top-items-by-time-empty"/.test(tic)
  ) {
    findings.push({ level: 'info', message: `iter670 invariant: top-items-empty 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter670 invariant: 破壊` })
  }

  // 4. iter669 invariant: team-capacity-empty 維持
  const tcp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-capacity-panel.tsx'),
    'utf8',
  )
  if (
    /role="status"\s*\n\s*aria-live="polite"\s*\n\s*data-testid="team-capacity-empty"/.test(tcp)
  ) {
    findings.push({ level: 'info', message: `iter669 invariant: team-capacity-empty 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter669 invariant: 破壊` })
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

  // 6. iter666 invariant: swimlane-empty 維持
  const ssd = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprint-swimlane-disclosure.tsx'),
    'utf8',
  )
  if (
    /role="status"\s*\n\s*aria-live="polite"\s*\n\s*data-testid="sprint-swimlane-empty"/.test(ssd)
  ) {
    findings.push({ level: 'info', message: `iter666 invariant: swimlane-empty 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter666 invariant: 破壊` })
  }

  console.log(`\n=== Findings (severity-chip-focus-iter671) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
