/**
 * Phase 6.15 loop iter 860 (mode-D Desktop a11y) —
 * sprints-panel sprint planning-return button (active→planning): WCAG 2.5.3
 * (Label in Name) を pending 状態で修正 + visible "計画に戻す" を span
 * aria-hidden で wrap (campaign 統一)。
 *
 * 課題: sprints-panel.tsx の active sprint 用「計画に戻す」 button (data-testid 無し)
 *   は pending 中 aria-label "Sprint「{name}」のステータスを変更中…" で「計画に戻す」
 *   token を完全に含まず、visible と乖離 (iter858/859 と同根、3 transition button
 *   共通の曖昧 label シリーズ最後)。
 *
 * fix (1 ファイル / +3-2 行差分):
 *   - aria-label pending: `Sprint「${name}」を計画に戻す処理中… (active → planning 遷移)`
 *   - aria-label normal: `Sprint「${name}」を計画に戻す (active → planning へ遷移)`
 *   - visible "計画に戻す" を <span aria-hidden="true"> で wrap
 *   - Pause icon 既存 aria-hidden 維持
 *
 * 検証: source-side regex assert + iter858-859 invariant cross-check。
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

  // 1. pending aria-label に visible "計画に戻す" prefix
  if (/`Sprint「\$\{sprint\.name\}」を計画に戻す処理中… \(active → planning 遷移\)`/.test(sp)) {
    findings.push({
      level: 'info',
      message: `planning-return pending aria-label に "計画に戻す" prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `planning-return pending aria-label が "計画に戻す" を prefix に含まない`,
    })
  }

  // 2. normal aria-label に方向 hint
  if (/`Sprint「\$\{sprint\.name\}」を計画に戻す \(active → planning へ遷移\)`/.test(sp)) {
    findings.push({
      level: 'info',
      message: `planning-return normal aria-label に active→planning hint 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `planning-return normal aria-label に active→planning hint が無い`,
    })
  }

  // 3. visible "計画に戻す" span aria-hidden
  if (/<span aria-hidden="true">計画に戻す<\/span>/.test(sp)) {
    findings.push({
      level: 'info',
      message: `planning-return visible "計画に戻す" span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `planning-return visible "計画に戻す" aria-hidden 未統合`,
    })
  }

  // iter859 invariant: sprint-complete aria-label
  if (/`Sprint「\$\{sprint\.name\}」を完了 \(active → completed へ遷移\)`/.test(sp)) {
    findings.push({
      level: 'info',
      message: `iter859 invariant: sprint-complete aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter859 invariant: sprint-complete 破壊` })
  }

  // iter858 invariant: sprint-activate aria-label
  if (/`Sprint「\$\{sprint\.name\}」を稼働開始 \(planning → active へ遷移\)`/.test(sp)) {
    findings.push({
      level: 'info',
      message: `iter858 invariant: sprint-activate aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter858 invariant: sprint-activate 破壊` })
  }

  // iter857 invariant: sprint-period-cancel
  if (
    /data-testid=\{`sprint-period-cancel-\$\{sprint\.id\}`\}[\s\S]+?<span aria-hidden="true">キャンセル<\/span>/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter857 invariant: sprint-period-cancel aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter857 invariant: sprint-period-cancel 破壊` })
  }

  console.log(`\n=== Findings (sprint-planning-return-label-in-name-iter860) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
