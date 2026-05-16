/**
 * Phase 6.15 loop iter 866 (mode-D Desktop a11y) —
 * workflows-panel run-history: toggle button 内 triggerKind / 時刻 + rerun
 * button 内 「再」 visible text を aria-hidden span で wrap (一括)。
 *
 * 課題: src/components/workflow/workflows-panel.tsx の WorkflowRunHistory には
 *   2 種 button が残存:
 *     1. run-history toggle button (各 run row): visible 内に triggerKind /
 *        時刻 / duration が並ぶ。aria-label は triggerKind + 時刻 + ノード詳細
 *        を含むが、duration は含まない (= 純粋 visible 補助情報)。
 *        → triggerKind / 時刻 だけ aria-hidden 化、duration は visible (SR で
 *        も 1 回 announced) で残す = 部分修正で実害なし
 *     2. rerun button: visible "再" + Play icon。aria-label「実行 ${id} を
 *        再実行...」 が visible "再" を含む。→ <span aria-hidden="true">再</span>
 *        で wrap、aria-label 単独経路に
 *
 * fix (1 file ~3 spot):
 *   - run-history toggle: triggerKind span + time element に aria-hidden=true
 *   - rerun button: visible "再" を span aria-hidden で wrap
 *   - duration span は変更なし (aria-label に含まれていない補助情報、
 *     SR に届ける必要があるため visible で残す)
 *   - 機能不変、視覚 layout 不変、shadcn 編集なし
 *   - iter859 (workflows-panel 11 button) の最終 catch-up
 *
 * 検証: source-side regex assert + iter735/859/865 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )

  // 1. run-history toggle: triggerKind span aria-hidden
  if (
    /<span className="text-muted-foreground" aria-hidden="true">\s*\{r\.triggerKind\}\s*<\/span>/.test(
      wp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `run-history triggerKind span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `run-history triggerKind span aria-hidden 未統合`,
    })
  }

  // 2. run-history toggle: time element aria-hidden
  if (
    /<time[\s\S]+?className="text-muted-foreground tabular-nums"[\s\S]+?aria-hidden="true"[\s\S]+?>\s*\{formatRunTime\(r\)\}\s*<\/time>/.test(
      wp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `run-history time element aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `run-history time element aria-hidden 未統合`,
    })
  }

  // 3. duration span は維持 (aria-label に含まれていない補助情報、aria-hidden 無し)
  if (
    /<span className="text-muted-foreground ml-auto tabular-nums">\s*\{formatRunDuration\(r\)\}\s*<\/span>/.test(
      wp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `run-history duration span 維持 (visible-only、SR にも届ける) OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `run-history duration span 不在 or aria-hidden 化されてしまっている (SR が duration を聞き取れない)`,
    })
  }

  // 4. rerun button: visible "再" aria-hidden
  if (/<Play[\s\S]+?aria-hidden="true"[\s\S]+?\/>\s*<span aria-hidden="true">再<\/span>/.test(wp)) {
    findings.push({
      level: 'info',
      message: `rerun button visible "再" aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `rerun button visible "再" aria-hidden 未統合`,
    })
  }

  // aria-label 維持 (toggle / rerun)
  if (
    /aria-label=\{[\s\S]+?`\$\{r\.triggerKind\} 実行 \(\$\{formatRunTime\(r\)\}\) のノード詳細を表示`/.test(
      wp,
    ) &&
    /aria-label=\{[\s\S]+?`実行 \$\{r\.id\.slice\(0, 8\)\} を同じ input で再実行`/.test(wp)
  ) {
    findings.push({
      level: 'info',
      message: `run-history toggle + rerun aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `aria-label 破壊` })
  }

  // iter859 invariant: workflows-panel main 11 button aria-hidden
  if (
    /<span aria-hidden="true">作成フォームへ<\/span>/.test(wp) &&
    /<span aria-hidden="true">編集<\/span>/.test(wp) &&
    /<span aria-hidden="true">manual<\/span>/.test(wp)
  ) {
    findings.push({
      level: 'info',
      message: `iter859 invariant: workflows-panel main button 群 aria-hidden 維持 OK (3 sample 確認)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter859 invariant: 破壊` })
  }

  // iter865 invariant: goals-panel EmptyState 作成フォームへ aria-hidden
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (
    /data-testid="goals-empty-create"[\s\S]+?<span aria-hidden="true">作成フォームへ<\/span>/.test(
      gp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter865 invariant: goals-empty-create aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter865 invariant: 破壊` })
  }

  // iter735 invariant: team-context-editor aria-keyshortcuts
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

  console.log(`\n=== Findings (workflows-runhistory-aria-hidden-iter866) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
