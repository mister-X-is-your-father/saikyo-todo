/**
 * Phase 6.15 loop iter 863 (mode-D Desktop a11y) —
 * sprints-panel sprint-premortem button: WCAG 2.5.3 (Label in Name) 違反を 3
 * 状態すべてで修正 + visible 3 状態を span aria-hidden で wrap (campaign 統一)。
 *
 * 課題: src/components/workspace/sprints-panel.tsx の sprint-premortem button は
 *   visible "Pre-mortem 生成" (空白あり) に対し旧 aria-label "Sprint「{name}」の
 *   Pre-mortem を生成 (...)" は `を` token が間に入って substring 不適合。
 *   3 状態 (生成 / 再生成 / 生成中…) すべてで `を` mismatch の WCAG 2.5.3 違反。
 *   既存 sprint-retro (iter862) と同 root cause、これで sprints-panel campaign 完結。
 *
 * fix (1 ファイル / +6-3 行差分):
 *   - aria-label normal: `Sprint「${name}」Pre-mortem 生成 (PM Agent が想定リスクと早期警報を Doc 化)`
 *   - aria-label re-gen: `Sprint「${name}」Pre-mortem 再生成 (...既存を上書き)`
 *   - aria-label pending: `Sprint「${name}」Pre-mortem 生成中… (...)`
 *   - visible 3 状態を <span aria-hidden="true"> で wrap
 *   - title (DBA hint 風) 維持
 *
 * 検証: source-side regex assert + iter858-862 invariant cross-check。
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

  // 1. normal aria-label に visible "Pre-mortem 生成" prefix
  if (
    /`Sprint「\$\{sprint\.name\}」Pre-mortem 生成 \(PM Agent が想定リスクと早期警報を Doc 化\)`/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `sprint-premortem normal aria-label に "Pre-mortem 生成" prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-premortem normal aria-label が "Pre-mortem 生成" を prefix に含まない`,
    })
  }

  // 2. re-gen aria-label に visible "Pre-mortem 再生成" prefix
  if (
    /`Sprint「\$\{sprint\.name\}」Pre-mortem 再生成 \(PM Agent が想定リスクと早期警報を Doc 化、既存を上書き\)`/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `sprint-premortem re-gen aria-label に "Pre-mortem 再生成" prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-premortem re-gen aria-label が "Pre-mortem 再生成" を prefix に含まない`,
    })
  }

  // 3. pending aria-label に visible "Pre-mortem 生成中…" prefix
  if (
    /`Sprint「\$\{sprint\.name\}」Pre-mortem 生成中… \(PM Agent が想定リスクと早期警報を Doc 化\)`/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `sprint-premortem pending aria-label に "Pre-mortem 生成中…" prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-premortem pending aria-label が "Pre-mortem 生成中…" を prefix に含まない`,
    })
  }

  // 4. visible 3 状態 span aria-hidden
  if (
    /<span aria-hidden="true">\s*\{premortemPending[\s\S]+?'Pre-mortem 生成中…'[\s\S]+?'Pre-mortem 再生成'[\s\S]+?'Pre-mortem 生成'\}\s*<\/span>/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `sprint-premortem visible 3 状態 span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-premortem visible 3 状態 aria-hidden 未統合`,
    })
  }

  // 5. data-testid 維持
  if (/data-testid=\{`sprint-premortem-\$\{sprint\.id\}`\}/.test(sp)) {
    findings.push({
      level: 'info',
      message: `sprint-premortem data-testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `sprint-premortem data-testid 破壊` })
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

  // iter861 invariant: sprint-cancel
  if (
    /`Sprint「\$\{sprint\.name\}」を中止 \(status を cancelled に、割当 Item は残る\)`/.test(sp)
  ) {
    findings.push({
      level: 'info',
      message: `iter861 invariant: sprint-cancel aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter861 invariant: sprint-cancel 破壊` })
  }

  console.log(`\n=== Findings (sprint-premortem-label-in-name-iter863) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
