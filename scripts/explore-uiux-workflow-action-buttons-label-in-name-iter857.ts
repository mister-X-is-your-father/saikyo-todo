/**
 * Phase 6.15 loop iter 857 (mode-D Desktop a11y) —
 * workflows-panel WorkflowCard 操作 button 群 (実行 / 編集 / toggle / 履歴 4 件):
 * WCAG 2.5.3 (Label in Name) 一括適合 + visible aria-hidden 統一。
 *
 * 課題: src/components/workflow/workflows-panel.tsx の 4 button (wf-run / wf-edit /
 *   wf-toggle / wf-runs-toggle) は visible "実行" / "編集" / "無効化(有効化)" / "履歴"
 *   がいずれも旧 aria-label "Workflow「N」を…" の suffix substring としては含まれるが
 *   prefix では無く voice user 発話と name 先頭が一致しない → WCAG 2.5.3 (Label in
 *   Name) 推奨形に未到達。wf-edit / wf-toggle / wf-runs-toggle は visible text も
 *   span aria-hidden 未統合だった。iter844-856 で同 pattern を順次適合化済。
 *
 * fix (1 ファイル、4 button 一括 ~10 行差分):
 *   - 各 aria-label を visible text prefix 形に変更:
 *     - 実行 / 実行中… → 「実行 (…)」 / 「実行中… (…)」
 *     - 編集 → 「編集 (Workflow「N」の graph / trigger を編集)」
 *     - 無効化(有効化) → 「無効化(有効化) (Workflow「N」)」
 *     - 履歴 → 「履歴 (Workflow「N」の実行履歴 直近 5 件を…)」
 *   - 同時に各 visible text を <span aria-hidden="true"> で wrap、aria-label 単独
 *     経路に統一 (iter844-856 と一貫)。wf-run は元々 aria-hidden 維持。
 *
 * 検証: source-side regex assert + iter850/853/855/856 invariant cross-check。
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

  // 1. wf-run aria-label に visible "実行" / "実行中…" prefix
  if (
    /aria-label=\{[\s\S]+?`実行 \(Workflow「\$\{wf\.name\}」は無効化中のため実行不可\)`/.test(wp) &&
    /aria-label=\{[\s\S]+?`実行中… \(Workflow「\$\{wf\.name\}」\)`/.test(wp)
  ) {
    findings.push({
      level: 'info',
      message: `wf-run aria-label visible "実行" / "実行中…" prefix OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `wf-run aria-label NG` })
  }
  if (/<span aria-hidden="true">\{trigger\.isPending \? '実行中…' : '実行'\}<\/span>/.test(wp)) {
    findings.push({
      level: 'info',
      message: `wf-run visible 実行(中…) span aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `wf-run aria-hidden NG` })
  }

  // 2. wf-edit aria-label visible "編集" prefix + aria-hidden
  if (/aria-label=\{`編集 \(Workflow「\$\{wf\.name\}」の graph \/ trigger を編集\)`\}/.test(wp)) {
    findings.push({
      level: 'info',
      message: `wf-edit aria-label visible "編集" prefix OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `wf-edit aria-label NG` })
  }
  if (/<span aria-hidden="true">編集<\/span>/.test(wp)) {
    findings.push({
      level: 'info',
      message: `wf-edit visible "編集" span aria-hidden OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `wf-edit aria-hidden NG` })
  }

  // 3. wf-toggle aria-label visible "無効化(有効化)" prefix + aria-hidden
  if (
    /aria-label=\{[\s\S]+?`\$\{wf\.enabled \? '無効化' : '有効化'\} \(Workflow「\$\{wf\.name\}」\)`/.test(
      wp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `wf-toggle aria-label visible "無効化(有効化)" prefix OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `wf-toggle aria-label NG` })
  }
  if (/<span aria-hidden="true">\{wf\.enabled \? '無効化' : '有効化'\}<\/span>/.test(wp)) {
    findings.push({
      level: 'info',
      message: `wf-toggle visible 無効化(有効化) span aria-hidden OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `wf-toggle aria-hidden NG` })
  }

  // 4. wf-runs-toggle aria-label visible "履歴" prefix + aria-hidden
  if (
    /aria-label=\{[\s\S]+?`履歴 \(Workflow「\$\{wf\.name\}」の実行履歴 直近 5 件を表示\)`/.test(wp)
  ) {
    findings.push({
      level: 'info',
      message: `wf-runs-toggle aria-label visible "履歴" prefix OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `wf-runs-toggle aria-label NG` })
  }
  if (/<span aria-hidden="true">履歴<\/span>/.test(wp)) {
    findings.push({
      level: 'info',
      message: `wf-runs-toggle visible "履歴" span aria-hidden OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `wf-runs-toggle aria-hidden NG` })
  }

  // iter856 invariant: sprint status buttons aria-hidden
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">期間<\/span>/.test(sp) &&
    /<span aria-hidden="true">稼働開始<\/span>/.test(sp) &&
    /<span aria-hidden="true">完了<\/span>/.test(sp) &&
    /<span aria-hidden="true">計画に戻す<\/span>/.test(sp) &&
    /<span aria-hidden="true">中止<\/span>/.test(sp)
  ) {
    findings.push({
      level: 'info',
      message: `iter856 invariant: sprint status 5 button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter856 invariant: 破壊` })
  }

  // iter853 invariant: gantt jump-today
  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')
  if (/<span aria-hidden="true">今日へジャンプ<\/span>/.test(gv)) {
    findings.push({
      level: 'info',
      message: `iter853 invariant: gantt jump-today aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter853 invariant: 破壊` })
  }

  // iter850 invariant: bulk-delete
  const bab = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/bulk-action-bar.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">削除<\/span>/.test(bab)) {
    findings.push({
      level: 'info',
      message: `iter850 invariant: bulk-delete "削除" aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter850 invariant: 破壊` })
  }

  console.log(`\n=== Findings (workflow-action-buttons-label-in-name-iter857) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
