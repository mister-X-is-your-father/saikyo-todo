/**
 * Phase 6.15 loop iter 737 (mode-D Desktop a11y) —
 * sprints-panel の Sprint goal Textarea に aria-keyshortcuts を追加
 * (iter735 / iter736 sweep の続き)。
 *
 * 課題: sprints-panel.tsx 行 273-301 の Sprint goal Textarea (sprint 作成時の
 *   ゴール入力) は onKeyDown で Cmd/Ctrl+Enter trap して作成するが、
 *   aria-keyshortcuts attribute が無い。同 form の Submit button (行 310) は
 *   `aria-keyshortcuts="Meta+Enter Control+Enter"` 付与済で非対称。
 *   実際にショートカットを撃つ focus target である Textarea 自体には未付与で、
 *   SR ユーザは Textarea focus 中に shortcut の存在を直接 channel として知る術がない。
 *
 * fix (1 ファイル ~1 行差分):
 *   - Textarea に `aria-keyshortcuts="Meta+Enter Control+Enter"` を追加
 *
 * 検証: source-side regex assert + iter720-736 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )

  // 1. sprints-panel の Sprint goal Textarea + Submit button 両方に aria-keyshortcuts
  // 元々 Submit button (行 310) には付与済 (1 箇所)、追加で goal Textarea にも付与 → 2 箇所
  const matches = sp.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (matches.length >= 2) {
    findings.push({
      level: 'info',
      message: `sprints-panel goal Textarea aria-keyshortcuts 追加 OK (${matches.length} 箇所、Textarea + Submit button)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprints-panel aria-keyshortcuts 不完全 (${matches.length} 箇所のみ)`,
    })
  }

  // 2. iter736 invariant: comment-thread Textarea aria-keyshortcuts 維持
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

  // 3. iter735 invariant: team-context-editor Textarea aria-keyshortcuts 維持
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

  // 4. iter728 invariant: taskchute-view ol 件数動的化維持
  const tc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/taskchute-view.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`今日の task を時刻昇順で並べた 1 列 timeline \$\{ordered\.length\} 件`\}/.test(
      tc,
    )
  ) {
    findings.push({ level: 'info', message: `iter728 invariant: taskchute-view ol 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter728 invariant: 破壊` })
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

  console.log(`\n=== Findings (sprints-goal-keyshortcuts-iter737) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
