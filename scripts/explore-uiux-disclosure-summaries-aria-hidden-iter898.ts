/**
 * Phase 6.15 loop iter 898 (mode-D Desktop a11y) —
 * 2 disclosure <summary> visible aria-hidden 統合 (一括 2 surface):
 * team-capacity-summary-toggle + wf-node-run-output-summary。
 *
 * 課題: 各々 aria-label substring 適合だったが iter844-897 campaign 規約
 *   (visible aria-hidden 単独経路) から外れていた最後の <summary> visible-text element 群。
 *
 * fix (2 ファイル / +2-2 行差分、2 element 一括):
 *   - team-capacity summary: visible "チームメンバー 余裕時間 (今日 / 今週)" → <span aria-hidden> wrap
 *   - wf-node-run-output-summary: visible "output (jsonb)" → <span aria-hidden> wrap
 *
 * 検証: source-side regex assert + iter896/897 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-capacity-panel.tsx'),
    'utf8',
  )
  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )

  // 1. team-capacity-summary visible aria-hidden
  if (/<span aria-hidden="true">チームメンバー 余裕時間 \(今日 \/ 今週\)<\/span>/.test(tc)) {
    findings.push({
      level: 'info',
      message: `team-capacity-summary visible "チームメンバー 余裕時間 (今日 / 今週)" span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `team-capacity-summary visible aria-hidden 未統合`,
    })
  }

  // 2. wf-node-run-output-summary visible "output (jsonb)" aria-hidden
  if (/<span aria-hidden="true">output \(jsonb\)<\/span>/.test(wp)) {
    findings.push({
      level: 'info',
      message: `wf-node-run-output-summary visible "output (jsonb)" span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `wf-node-run-output-summary visible aria-hidden 未統合`,
    })
  }

  // 3. team-capacity aria-label 維持
  if (
    /'チームメンバー 余裕時間 \(今日 \/ 今週\) を閉じる'[\s\S]+?'チームメンバー 余裕時間 \(今日 \/ 今週\) を開く'/.test(
      tc,
    )
  ) {
    findings.push({
      level: 'info',
      message: `team-capacity-summary aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `team-capacity-summary aria-label 破壊` })
  }

  // iter897 invariant: workspace 一覧 Link
  const wp2 = readFileSync(
    resolve(process.cwd(), 'src/app/(workspace)/[workspaceId]/page.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">← 一覧<\/span>/.test(wp2)) {
    findings.push({
      level: 'info',
      message: `iter897 invariant: workspace 一覧 Link aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter897 invariant: workspace 一覧 破壊` })
  }

  console.log(`\n=== Findings (disclosure-summaries-aria-hidden-iter898) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
