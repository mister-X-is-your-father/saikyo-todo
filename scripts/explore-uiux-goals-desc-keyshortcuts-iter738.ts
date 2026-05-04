/**
 * Phase 6.15 loop iter 738 (mode-D Desktop a11y) —
 * goals-panel の Goal description Textarea に aria-keyshortcuts を追加
 * (iter735-737 sweep の続き)。
 *
 * 課題: goals-panel.tsx 行 213-240 の Goal description Textarea (Goal 作成時の
 *   説明入力) は onKeyDown で Cmd/Ctrl+Enter trap して作成するが、
 *   aria-keyshortcuts attribute が無い。同 form の Submit button (行 249) は
 *   `aria-keyshortcuts="Meta+Enter Control+Enter"` 付与済で非対称。
 *
 * fix (1 ファイル ~1 行差分):
 *   - Textarea に `aria-keyshortcuts="Meta+Enter Control+Enter"` を追加
 *
 * 検証: source-side regex assert + iter720-737 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )

  // 1. goals-panel に aria-keyshortcuts が複数箇所 (Submit button + Goal desc Textarea + KR Submit button)
  const matches = gp.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (matches.length >= 2) {
    findings.push({
      level: 'info',
      message: `goals-panel desc Textarea aria-keyshortcuts 追加 OK (${matches.length} 箇所)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `goals-panel aria-keyshortcuts 不完全 (${matches.length} 箇所のみ)`,
    })
  }

  // 2. iter737 invariant: sprints-panel goal Textarea aria-keyshortcuts 維持
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  const spMatches = sp.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (spMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter737 invariant: sprints-panel aria-keyshortcuts 維持 OK (${spMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter737 invariant: 破壊` })
  }

  // 3. iter736 invariant: comment-thread aria-keyshortcuts 維持
  const ct = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/comment-thread.tsx'),
    'utf8',
  )
  const ctMatches = ct.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (ctMatches.length >= 3) {
    findings.push({
      level: 'info',
      message: `iter736 invariant: comment-thread aria-keyshortcuts 維持 OK (${ctMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter736 invariant: 破壊` })
  }

  // 4. iter735 invariant: team-context-editor aria-keyshortcuts 維持
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter735 invariant: team-context-editor aria-keyshortcuts 維持 OK (${tceMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant: 破壊` })
  }

  // 5. iter720 invariant: cycle-check status dl 維持
  const ccs = readFileSync(
    resolve(process.cwd(), 'src/components/pdca/cycle-check-stats-card.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`ステータス分布 \(完了 \$\{stats\.done\} 件 \/ 未完了 \$\{stats\.inProgressOrTodo\} 件 \/ cancelled \$\{stats\.cancelled\} 件\)`\}/.test(
      ccs,
    )
  ) {
    findings.push({ level: 'info', message: `iter720 invariant: cycle-check status 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter720 invariant: 破壊` })
  }

  console.log(`\n=== Findings (goals-desc-keyshortcuts-iter738) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
