/**
 * Phase 6.15 loop iter 864 (mode-D Desktop a11y) —
 * goals-panel goal-complete button: WCAG 2.5.3 (Label in Name) 違反を pending
 * 状態で修正 + visible "完了" を span aria-hidden で wrap (campaign 拡張)。
 *
 * 課題: src/components/workspace/goals-panel.tsx の goal-complete button は
 *   pending 中 aria-label "Goal「{title}」のステータスを更新中…" で「完了」 token
 *   を完全に含まず、visible "完了" と完全乖離 (WCAG 2.5.3 違反、iter858/859 sprint
 *   transition と同 root cause)。Goal status 4 transition button (complete/archive
 *   /reactivate) すべてが同 pending aria-label を共有するため SR で方向性不明。
 *
 * fix (1 ファイル / +3-1 行差分):
 *   - aria-label pending: `Goal「${title}」を完了中… (active → completed 遷移)`
 *   - aria-label normal: `Goal「${title}」を完了 (active → completed へ遷移)`
 *   - visible "完了" を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter858-863 invariant cross-check。
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

  // 1. pending aria-label に visible "完了" prefix
  if (/`Goal「\$\{goal\.title\}」を完了中… \(active → completed 遷移\)`/.test(gp)) {
    findings.push({
      level: 'info',
      message: `goal-complete pending aria-label に "完了" prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `goal-complete pending aria-label が "完了" を prefix に含まない`,
    })
  }

  // 2. normal aria-label に方向 hint
  if (/`Goal「\$\{goal\.title\}」を完了 \(active → completed へ遷移\)`/.test(gp)) {
    findings.push({
      level: 'info',
      message: `goal-complete normal aria-label に active→completed hint 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `goal-complete normal aria-label に active→completed hint が無い`,
    })
  }

  // 3. visible "完了" span aria-hidden (goal-complete context)
  if (
    /data-testid=\{`goal-complete-\$\{goal\.id\}`\}[\s\S]+?<span aria-hidden="true">完了<\/span>/.test(
      gp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `goal-complete visible "完了" span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `goal-complete visible "完了" aria-hidden 未統合`,
    })
  }

  // iter863 invariant: sprint-premortem
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (
    /`Sprint「\$\{sprint\.name\}」Pre-mortem 生成 \(PM Agent が想定リスクと早期警報を Doc 化\)`/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter863 invariant: sprint-premortem aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter863 invariant: sprint-premortem 破壊` })
  }

  // iter862 invariant: sprint-retro
  if (
    /`Sprint「\$\{sprint\.name\}」振り返り生成 \(PM Agent が完了\/未完 items を要約して Retro Doc 化\)`/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter862 invariant: sprint-retro aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter862 invariant: sprint-retro 破壊` })
  }

  // iter858 invariant: sprint-activate
  if (/`Sprint「\$\{sprint\.name\}」を稼働開始 \(planning → active へ遷移\)`/.test(sp)) {
    findings.push({
      level: 'info',
      message: `iter858 invariant: sprint-activate aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter858 invariant: sprint-activate 破壊` })
  }

  console.log(`\n=== Findings (goal-complete-label-in-name-iter864) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
