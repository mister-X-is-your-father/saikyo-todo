/**
 * Phase 6.15 loop iter 858 (mode-D Desktop a11y) —
 * sprints-panel sprint-activate button: WCAG 2.5.3 (Label in Name) 違反 を pending
 * 状態 で 修正 + visible "稼働開始" を span aria-hidden で wrap (campaign 統一)。
 *
 * 課題: src/components/workspace/sprints-panel.tsx の sprint-activate button は
 *   pending 中 aria-label "Sprint「{name}」のステータスを変更中…" で「稼働開始」 token
 *   を完全に含まず、visible "稼働開始" と完全乖離 (WCAG 2.5.3 違反)。
 *   音声「稼働開始」が pending 中 button hit せず、結果が pending 中も視覚で
 *   「稼働開始ボタンが反応中」と分かるが SR で「ステータスを変更中…」だけ読まれて
 *   何の status 変更かが伝わらない (planning → active か active → completed か等)。
 *
 * fix (1 ファイル / +3-2 行差分):
 *   - aria-label pending: `Sprint「${name}」を稼働開始中… (planning → active 遷移)`
 *   - aria-label normal: `Sprint「${name}」を稼働開始 (planning → active へ遷移)` (planning→active hint 追加)
 *   - visible "稼働開始" を <span aria-hidden="true"> で wrap (campaign 統一)
 *   - Play icon は既存の aria-hidden 維持
 *
 * 検証: source-side regex assert + iter857-849 invariant cross-check。
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

  // 1. pending 状態の aria-label に visible "稼働開始" prefix
  if (/`Sprint「\$\{sprint\.name\}」を稼働開始中… \(planning → active 遷移\)`/.test(sp)) {
    findings.push({
      level: 'info',
      message: `sprint-activate pending aria-label に visible "稼働開始" prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-activate pending aria-label が visible "稼働開始" を prefix に含まない`,
    })
  }

  // 2. normal aria-label に planning→active hint
  if (/`Sprint「\$\{sprint\.name\}」を稼働開始 \(planning → active へ遷移\)`/.test(sp)) {
    findings.push({
      level: 'info',
      message: `sprint-activate normal aria-label に planning→active hint 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-activate normal aria-label に planning→active hint が無い`,
    })
  }

  // 3. visible "稼働開始" span aria-hidden で wrap
  if (
    /data-testid=\{`sprint-activate-\$\{sprint\.id\}`\}[\s\S]+?<span aria-hidden="true">稼働開始<\/span>/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `sprint-activate visible "稼働開始" span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-activate visible "稼働開始" aria-hidden 未統合`,
    })
  }

  // 4. 旧 aria-label "ステータスを変更中…" pattern が消えている (sprint-activate のみ)
  // 注意: sprint-complete / planning-return も同 pattern を共有しているので、まだ残存している可能性あり (別 iter で修正予定)。
  // sprint-activate コンテキストの近傍に旧 pattern が無いことを確認。
  const activateRegion = sp.match(/data-testid=\{`sprint-activate-\$\{sprint\.id\}`\}[\s\S]{0,400}/)
  if (
    activateRegion &&
    !/Sprint「\$\{sprint\.name\}」のステータスを変更中…/.test(activateRegion[0])
  ) {
    findings.push({
      level: 'info',
      message: `sprint-activate 旧 aria-label "ステータスを変更中" pattern (近傍) 削除済 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-activate 旧 aria-label "ステータスを変更中" pattern (近傍) が残存`,
    })
  }

  // 5. data-testid 維持
  if (/data-testid=\{`sprint-activate-\$\{sprint\.id\}`\}/.test(sp)) {
    findings.push({
      level: 'info',
      message: `sprint-activate data-testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `sprint-activate data-testid 破壊` })
  }

  // iter857 invariant: sprint-period-cancel visible aria-hidden
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

  // iter856 invariant: clear-baseline aria-label
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
      message: `iter856 invariant: clear-baseline aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter856 invariant: clear-baseline 破壊` })
  }

  console.log(`\n=== Findings (sprint-activate-label-in-name-iter858) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
