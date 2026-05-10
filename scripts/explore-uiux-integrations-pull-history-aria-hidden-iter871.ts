/**
 * Phase 6.15 loop iter 871 (mode-D Desktop a11y) —
 * integrations-panel Source card 内 src-pull + src-imports-toggle button: visible
 * text を span aria-hidden で wrap (一括 campaign 拡張、Workflow card iter869 と
 * 同 pattern)。
 *
 * 課題: src/components/integrations/integrations-panel.tsx の Source card 操作 row:
 *   - src-pull (visible "Pull 中…"/"Pull") aria-label "Source「{name}」を手動 Pull (...)" → 適合
 *   - src-imports-toggle (visible "履歴") aria-label "...の Pull 履歴 (直近 5 件) を表示/閉じる" → 適合
 *   いずれも aria-label substring 適合だったが iter867-870 campaign 規約 (visible
 *   aria-hidden 単独経路) から外れていた。
 *
 * fix (1 ファイル / +2-2 行差分、2 button 一括):
 *   - <Button>{trigger.isPending ? 'Pull 中…' : 'Pull'}</Button> → <Button><span aria-hidden="true">{...}</span></Button>
 *   - <Button>履歴</Button> → <Button><span aria-hidden="true">履歴</span></Button>
 *
 * 検証: source-side regex assert + iter869-870 invariant cross-check。
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

  // 1. src-pull visible "Pull 中…"/"Pull" span aria-hidden
  if (/<span aria-hidden="true">\{trigger\.isPending \? 'Pull 中…' : 'Pull'\}<\/span>/.test(ip)) {
    findings.push({
      level: 'info',
      message: `src-pull visible Pull 中…/Pull span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `src-pull visible Pull aria-hidden 未統合`,
    })
  }

  // 2. src-imports-toggle visible "履歴" span aria-hidden
  if (
    /data-testid=\{`src-imports-toggle-\$\{src\.id\}`\}[\s\S]+?<span aria-hidden="true">履歴<\/span>/.test(
      ip,
    )
  ) {
    findings.push({
      level: 'info',
      message: `src-imports-toggle visible "履歴" span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `src-imports-toggle visible "履歴" aria-hidden 未統合`,
    })
  }

  // 3. data-testid 維持 (両方)
  if (/data-testid=\{`src-pull-\$\{src\.id\}`\}/.test(ip)) {
    findings.push({
      level: 'info',
      message: `src-pull data-testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `src-pull data-testid 破壊` })
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

  // iter869 invariant: wf-edit aria-hidden
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

  console.log(`\n=== Findings (integrations-pull-history-aria-hidden-iter871) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
