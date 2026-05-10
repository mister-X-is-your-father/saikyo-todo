/**
 * Phase 6.15 loop iter 872 (mode-D Desktop a11y) —
 * integrations-panel Source card 内 src-toggle button (有効化/無効化): WCAG 2.5.3
 * (Label in Name) を pending 状態で修正 + visible "有効化"/"無効化" を span
 * aria-hidden で wrap (wf-toggle iter870 と同 pattern)。
 *
 * 課題: src/components/integrations/integrations-panel.tsx の src-toggle button は
 *   visible "有効化"/"無効化" の対称 2 状態。pending 中 aria-label "Source「{name}」の
 *   状態を更新中…" は visible token を全く含まず WCAG 2.5.3 違反。さらに「無効化
 *   すると Pull が停止し」「有効化で再開する」 mental model が aria-label に欠落、
 *   user は無自覚に Source の自動 import を停止するリスク。
 *
 * fix (1 ファイル / +3-1 行差分):
 *   - aria-label pending: `Source「${name}」を${有効化/無効化}中… (enabled flag 切替)`
 *   - aria-label normal (有効→無効): `... を無効化 (Pull button + cron 自動 import を停止)`
 *   - aria-label normal (無効→有効): `... を有効化 (Pull button + cron 自動 import を再開)`
 *   - visible "有効化"/"無効化" を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter870/871 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )

  // 1. pending aria-label に visible 切替 prefix
  if (
    /`Source「\$\{src\.name\}」を\$\{src\.enabled \? '無効化' : '有効化'\}中… \(enabled flag 切替\)`/.test(
      ip,
    )
  ) {
    findings.push({
      level: 'info',
      message: `src-toggle pending aria-label に visible 切替 prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `src-toggle pending aria-label が visible 切替 prefix 不含`,
    })
  }

  // 2. normal aria-label に Pull 停止/再開 hint
  if (
    /`Source「\$\{src\.name\}」を\$\{src\.enabled \? '無効化 \(Pull button \+ cron 自動 import を停止\)' : '有効化 \(Pull button \+ cron 自動 import を再開\)'\}`/.test(
      ip,
    )
  ) {
    findings.push({
      level: 'info',
      message: `src-toggle normal aria-label に Pull 停止/再開 hint 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `src-toggle normal aria-label に Pull 停止/再開 hint が無い`,
    })
  }

  // 3. visible 切替 span aria-hidden
  if (/<span aria-hidden="true">\{src\.enabled \? '無効化' : '有効化'\}<\/span>/.test(ip)) {
    findings.push({
      level: 'info',
      message: `src-toggle visible 切替 span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `src-toggle visible 切替 aria-hidden 未統合`,
    })
  }

  // 4. 旧 "状態を更新中" pattern 削除
  if (!/Source「\$\{src\.name\}」の状態を更新中…/.test(ip)) {
    findings.push({
      level: 'info',
      message: `src-toggle 旧 aria-label "状態を更新中" pattern 削除済 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `src-toggle 旧 pattern 残存` })
  }

  // iter871 invariant: src-pull aria-hidden
  if (/<span aria-hidden="true">\{trigger\.isPending \? 'Pull 中…' : 'Pull'\}<\/span>/.test(ip)) {
    findings.push({
      level: 'info',
      message: `iter871 invariant: src-pull aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter871 invariant: src-pull 破壊` })
  }

  // iter870 invariant: wf-toggle aria-label
  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (
    /`Workflow「\$\{wf\.name\}」を\$\{wf\.enabled \? '無効化 \(実行 button \+ cron 自動 trigger を停止\)' : '有効化 \(実行 button \+ cron 自動 trigger を再開\)'\}`/.test(
      wp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter870 invariant: wf-toggle aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter870 invariant: wf-toggle 破壊` })
  }

  console.log(`\n=== Findings (integrations-toggle-label-in-name-iter872) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
