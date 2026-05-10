/**
 * Phase 6.15 loop iter 870 (mode-D Desktop a11y) —
 * workflows-panel Workflow card 内 wf-toggle button (有効化/無効化): WCAG 2.5.3
 * (Label in Name) を pending 状態で修正 + visible "有効化"/"無効化" を span
 * aria-hidden で wrap (campaign 拡張)。
 *
 * 課題: src/components/workflow/workflows-panel.tsx の wf-toggle button は visible
 *   "有効化" / "無効化" の対称 2 状態。pending 中 aria-label "Workflow「{name}」の
 *   状態を更新中…" は visible token を全く含まず (WCAG 2.5.3 違反、iter858/859
 *   sprint transition と同 root cause)。さらに「無効化すると何が止まるか」「有効化
 *   すると何が再開するか」の mental model が aria-label に欠落、user は無自覚に
 *   workflow を停止してしまうリスク。
 *
 * fix (1 ファイル / +3-1 行差分):
 *   - aria-label pending: `Workflow「${name}」を${有効化/無効化}中… (enabled flag 切替)`
 *   - aria-label normal (有効→無効): `... を無効化 (実行 button + cron 自動 trigger を停止)`
 *   - aria-label normal (無効→有効): `... を有効化 (実行 button + cron 自動 trigger を再開)`
 *   - visible "有効化"/"無効化" を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter867-869 invariant cross-check。
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

  // 1. pending aria-label に visible "有効化"/"無効化" 切替 prefix
  if (
    /`Workflow「\$\{wf\.name\}」を\$\{wf\.enabled \? '無効化' : '有効化'\}中… \(enabled flag 切替\)`/.test(
      wp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `wf-toggle pending aria-label に visible 切替 prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `wf-toggle pending aria-label が visible 切替 prefix を含まない`,
    })
  }

  // 2. normal aria-label に動作 hint (停止/再開 explicit)
  if (
    /`Workflow「\$\{wf\.name\}」を\$\{wf\.enabled \? '無効化 \(実行 button \+ cron 自動 trigger を停止\)' : '有効化 \(実行 button \+ cron 自動 trigger を再開\)'\}`/.test(
      wp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `wf-toggle normal aria-label に 停止/再開 hint 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `wf-toggle normal aria-label に 停止/再開 hint が無い`,
    })
  }

  // 3. visible 切替 span aria-hidden
  if (/<span aria-hidden="true">\{wf\.enabled \? '無効化' : '有効化'\}<\/span>/.test(wp)) {
    findings.push({
      level: 'info',
      message: `wf-toggle visible 切替 span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `wf-toggle visible 切替 aria-hidden 未統合`,
    })
  }

  // 4. 旧 aria-label "状態を更新中" pattern が消えている
  if (!/Workflow「\$\{wf\.name\}」の状態を更新中…/.test(wp)) {
    findings.push({
      level: 'info',
      message: `wf-toggle 旧 aria-label "状態を更新中" pattern 削除済 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `wf-toggle 旧 aria-label "状態を更新中" pattern が残存`,
    })
  }

  // iter869 invariant: wf-edit + wf-runs-toggle
  if (
    /data-testid=\{`wf-edit-\$\{wf\.id\}`\}[\s\S]+?<span aria-hidden="true">編集<\/span>/.test(wp)
  ) {
    findings.push({
      level: 'info',
      message: `iter869 invariant: wf-edit aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter869 invariant: wf-edit 破壊` })
  }

  // iter867 invariant: trigger preset 4 button
  const allKindsOk = ['manual', 'cron', 'item-event', 'webhook'].every((k) =>
    new RegExp(`<span aria-hidden="true">${k}</span>`).test(wp),
  )
  if (allKindsOk) {
    findings.push({
      level: 'info',
      message: `iter867 invariant: trigger preset 4 button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter867 invariant: trigger preset 破壊` })
  }

  console.log(`\n=== Findings (workflows-toggle-label-in-name-iter870) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
