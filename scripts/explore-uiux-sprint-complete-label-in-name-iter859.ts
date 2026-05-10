/**
 * Phase 6.15 loop iter 859 (mode-D Desktop a11y) —
 * sprints-panel sprint-complete button: WCAG 2.5.3 (Label in Name) 違反を pending
 * 状態で修正 + visible "完了" を span aria-hidden で wrap (campaign 統一)。
 *
 * 課題: src/components/workspace/sprints-panel.tsx の sprint-complete button は
 *   pending 中 aria-label "Sprint「{name}」のステータスを変更中…" で「完了」 token
 *   を完全に含まず、visible "完了" と完全乖離 (WCAG 2.5.3 違反 / iter858 と同根)。
 *   3 status transition button (activate / complete / planning return) が同じ
 *   pending aria-label を共有するため、SR で active→completed か planning→active か
 *   active→planning か方向性が不明。
 *
 * fix (1 ファイル / +3-2 行差分):
 *   - aria-label pending: `Sprint「${name}」を完了中… (active → completed 遷移)`
 *   - aria-label normal: `Sprint「${name}」を完了 (active → completed へ遷移)` (方向 hint 追加)
 *   - visible "完了" を <span aria-hidden="true"> で wrap (campaign 統一)
 *   - CheckCircle icon 既存 aria-hidden 維持
 *
 * 検証: source-side regex assert + iter857-858 invariant cross-check。
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

  // 1. pending aria-label に visible "完了" prefix
  if (/`Sprint「\$\{sprint\.name\}」を完了中… \(active → completed 遷移\)`/.test(sp)) {
    findings.push({
      level: 'info',
      message: `sprint-complete pending aria-label に "完了" prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-complete pending aria-label が "完了" を prefix に含まない`,
    })
  }

  // 2. normal aria-label に方向 hint
  if (/`Sprint「\$\{sprint\.name\}」を完了 \(active → completed へ遷移\)`/.test(sp)) {
    findings.push({
      level: 'info',
      message: `sprint-complete normal aria-label に active→completed hint 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-complete normal aria-label に active→completed hint が無い`,
    })
  }

  // 3. visible "完了" span aria-hidden
  if (
    /data-testid=\{`sprint-complete-\$\{sprint\.id\}`\}[\s\S]+?<span aria-hidden="true">完了<\/span>/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `sprint-complete visible "完了" span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-complete visible "完了" aria-hidden 未統合`,
    })
  }

  // 4. data-testid 維持
  if (/data-testid=\{`sprint-complete-\$\{sprint\.id\}`\}/.test(sp)) {
    findings.push({
      level: 'info',
      message: `sprint-complete data-testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `sprint-complete data-testid 破壊` })
  }

  // iter858 invariant: sprint-activate aria-label
  if (/`Sprint「\$\{sprint\.name\}」を稼働開始 \(planning → active へ遷移\)`/.test(sp)) {
    findings.push({
      level: 'info',
      message: `iter858 invariant: sprint-activate aria-label normal 維持 OK`,
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

  // iter856 invariant: clear-baseline
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (
    /`「\$\{item\.title\}」ベースラインクリア \(現在 \$\{item\.baselineStartDate\} → \$\{item\.baselineEndDate\} を NULL に戻す\)`/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter856 invariant: clear-baseline 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter856 invariant: clear-baseline 破壊` })
  }

  console.log(`\n=== Findings (sprint-complete-label-in-name-iter859) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
