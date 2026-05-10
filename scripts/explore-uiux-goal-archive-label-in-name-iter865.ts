/**
 * Phase 6.15 loop iter 865 (mode-D Desktop a11y) —
 * goals-panel goal-archive button (active / completed status 両方): WCAG 2.5.3
 * (Label in Name) 違反を pending 状態で修正 + visible "アーカイブ" を span
 * aria-hidden で wrap (campaign 拡張)。
 *
 * 課題: src/components/workspace/goals-panel.tsx の goal-archive button は active /
 *   completed 両 status から呼べるが pending 中 aria-label "Goal「{title}」のステータスを
 *   更新中…" は visible "アーカイブ" を含まず、4 transition button 共通の曖昧 label
 *   (iter858/859/864 と同 root)。後で復帰可能であることが SR で伝わらず、user は
 *   無自覚に「永続的削除」と誤解する mental model リスクもあった。
 *
 * fix (1 ファイル / +6-2 行差分、replace_all で 2 箇所一括):
 *   - aria-label pending: `Goal「${title}」をアーカイブ中… (現状態 → archived 遷移)`
 *   - aria-label normal: `Goal「${title}」をアーカイブ (現状態 → archived 遷移、後で active 復帰可)`
 *   - visible "アーカイブ" を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter858-864 invariant cross-check。
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

  // 1. pending aria-label (2 箇所、active/completed 両方) に visible "アーカイブ" prefix
  const pendingMatches = gp.match(
    /`Goal「\$\{goal\.title\}」をアーカイブ中… \(現状態 → archived 遷移\)`/g,
  )
  if (pendingMatches && pendingMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `goal-archive pending aria-label に "アーカイブ" prefix 含む (${pendingMatches.length} 箇所) OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `goal-archive pending aria-label が visible "アーカイブ" を 2 箇所 (active/completed) に含まない`,
    })
  }

  // 2. normal aria-label に「後で active 復帰可」 hint (2 箇所)
  const normalMatches = gp.match(
    /`Goal「\$\{goal\.title\}」をアーカイブ \(現状態 → archived 遷移、後で active 復帰可\)`/g,
  )
  if (normalMatches && normalMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `goal-archive normal aria-label に 復帰可 hint 含む (${normalMatches.length} 箇所) OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `goal-archive normal aria-label に 復帰可 hint が無い (2 箇所必要)`,
    })
  }

  // 3. visible "アーカイブ" span aria-hidden (2 箇所)
  const wrapMatches = gp.match(/<span aria-hidden="true">アーカイブ<\/span>/g)
  if (wrapMatches && wrapMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `goal-archive visible "アーカイブ" span aria-hidden (${wrapMatches.length} 箇所) 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `goal-archive visible "アーカイブ" aria-hidden 未統合 (2 箇所必要)`,
    })
  }

  // iter864 invariant: goal-complete aria-label
  if (/`Goal「\$\{goal\.title\}」を完了 \(active → completed へ遷移\)`/.test(gp)) {
    findings.push({
      level: 'info',
      message: `iter864 invariant: goal-complete aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter864 invariant: goal-complete 破壊` })
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

  console.log(`\n=== Findings (goal-archive-label-in-name-iter865) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
