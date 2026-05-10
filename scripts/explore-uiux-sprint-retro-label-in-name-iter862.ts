/**
 * Phase 6.15 loop iter 862 (mode-D Desktop a11y) —
 * sprints-panel sprint-retro button: WCAG 2.5.3 (Label in Name) 違反を修正
 * + visible "振り返り生成" / "振り返り生成中…" を span aria-hidden で wrap。
 *
 * 課題: src/components/workspace/sprints-panel.tsx の sprint-retro button は
 *   visible "振り返り生成" に対し旧 aria-label "Sprint「{name}」の振り返り Doc を
 *   生成 (PM Agent ...)" だったため、`Doc を` が token 間に入って visible "振り返り
 *   生成" を substring に含まなかった (WCAG 2.5.3 違反)。pending 中も visible
 *   "振り返り生成中…" は aria-label "の振り返りを生成中…" に対し `を` が間に入って
 *   substring 不適合。
 *
 * fix (1 ファイル / +3-2 行差分):
 *   - aria-label normal: `Sprint「${name}」振り返り生成 (PM Agent が完了/未完 items を要約して Retro Doc 化)`
 *   - aria-label pending: `Sprint「${name}」振り返り生成中… (PM Agent が完了/未完 items を要約)`
 *   - visible 2 状態を <span aria-hidden="true"> で wrap
 *   - title "PM Agent が完了/未完 items を要約して Retro Doc を生成" 維持
 *
 * 検証: source-side regex assert + iter858-861 invariant cross-check。
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

  // 1. normal aria-label に visible "振り返り生成" prefix
  if (
    /`Sprint「\$\{sprint\.name\}」振り返り生成 \(PM Agent が完了\/未完 items を要約して Retro Doc 化\)`/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `sprint-retro normal aria-label に "振り返り生成" prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-retro normal aria-label が "振り返り生成" を prefix に含まない`,
    })
  }

  // 2. pending aria-label に visible "振り返り生成中…" prefix
  if (
    /`Sprint「\$\{sprint\.name\}」振り返り生成中… \(PM Agent が完了\/未完 items を要約\)`/.test(sp)
  ) {
    findings.push({
      level: 'info',
      message: `sprint-retro pending aria-label に "振り返り生成中…" prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-retro pending aria-label が "振り返り生成中…" を prefix に含まない`,
    })
  }

  // 3. visible 2 状態 span aria-hidden
  if (
    /<span aria-hidden="true">\{retroPending \? '振り返り生成中…' : '振り返り生成'\}<\/span>/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `sprint-retro visible 2 状態 span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-retro visible 2 状態 aria-hidden 未統合`,
    })
  }

  // 4. title 維持
  if (/title="PM Agent が完了\/未完 items を要約して Retro Doc を生成"/.test(sp)) {
    findings.push({
      level: 'info',
      message: `sprint-retro title 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `sprint-retro title 破壊` })
  }

  // iter861 invariant: sprint-cancel aria-label
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

  // iter860 invariant: planning-return
  if (/`Sprint「\$\{sprint\.name\}」を計画に戻す \(active → planning へ遷移\)`/.test(sp)) {
    findings.push({
      level: 'info',
      message: `iter860 invariant: planning-return aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter860 invariant: planning-return 破壊` })
  }

  console.log(`\n=== Findings (sprint-retro-label-in-name-iter862) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
