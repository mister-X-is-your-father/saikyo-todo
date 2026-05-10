/**
 * Phase 6.15 loop iter 867 (mode-D Desktop a11y) —
 * workflows-panel trigger preset 4 button (manual / cron / item-event / webhook):
 * visible text を span aria-hidden で wrap (一括 campaign 拡張)。
 *
 * 課題: src/components/workflow/workflows-panel.tsx の Workflow 編集 dialog 内 trigger
 *   プリセット選択 row には manual / cron / item-event / webhook の 4 button があり、
 *   各 aria-label "trigger を {kind} (...) に切替" は visible text "{kind}" を完全
 *   含むため WCAG 2.5.3 適合。だが iter844-866 campaign 規約 (visible aria-hidden
 *   単独経路) から外れていた最後の Workflow editor 内 button group。
 *
 * fix (1 ファイル / +4-4 行差分、4 button 一括):
 *   - <Button>manual</Button> → <Button><span aria-hidden="true">manual</span></Button>
 *   - cron / item-event / webhook も同 pattern
 *   - aria-label / title / data-testid 維持
 *
 * 検証: source-side regex assert + iter863-866 invariant cross-check。
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

  // 1-4: 4 visible "{kind}" すべて span aria-hidden で wrap
  const kinds = ['manual', 'cron', 'item-event', 'webhook'] as const
  for (const k of kinds) {
    const pat = new RegExp(`<span aria-hidden="true">${k.replace('-', '-')}</span>`)
    if (pat.test(wp)) {
      findings.push({
        level: 'info',
        message: `wf-trigger-preset-${k} visible "${k}" span aria-hidden 統合 OK`,
      })
    } else {
      findings.push({
        level: 'warning',
        message: `wf-trigger-preset-${k} visible "${k}" aria-hidden 未統合`,
      })
    }
  }

  // 5: data-testid 4 件維持
  const tids = wp.match(/data-testid=\{`wf-trigger-preset-(manual|cron|item-event|webhook)-/g) ?? []
  if (tids.length === 4) {
    findings.push({
      level: 'info',
      message: `wf-trigger-preset 4 data-testid 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `wf-trigger-preset 4 data-testid 不足 (現在 ${tids.length})`,
    })
  }

  // iter866 invariant: goal-reactivate
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  const reactivateMatches = gp.match(
    /`Goal「\$\{goal\.title\}」を active に戻す \(現状態 → active 遷移、再開して KR を更新可能に\)`/g,
  )
  if (reactivateMatches && reactivateMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter866 invariant: goal-reactivate aria-label 維持 OK (${reactivateMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter866 invariant: goal-reactivate 破壊` })
  }

  // iter865 invariant: goal-archive
  const archiveMatches = gp.match(
    /`Goal「\$\{goal\.title\}」をアーカイブ \(現状態 → archived 遷移、後で active 復帰可\)`/g,
  )
  if (archiveMatches && archiveMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter865 invariant: goal-archive aria-label 維持 OK (${archiveMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter865 invariant: goal-archive 破壊` })
  }

  console.log(`\n=== Findings (workflows-trigger-preset-aria-hidden-iter867) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
