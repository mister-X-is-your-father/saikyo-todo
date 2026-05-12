/**
 * Phase 6.15 loop iter 858 (mode-D Desktop a11y) —
 * integrations-panel SourceCard 操作 button 群 (Pull / toggle / 履歴 3 件):
 * WCAG 2.5.3 (Label in Name) 一括適合 + visible aria-hidden 統一。
 *
 * 課題: src/components/integrations/integrations-panel.tsx の 3 button
 *   (src-pull / src-toggle / src-imports-toggle) は visible "Pull(中…)" /
 *   "無効化(有効化)" / "履歴" がいずれも旧 aria-label "Source「N」を…" の suffix
 *   substring としては含まれるが prefix では無く voice user 発話と name 先頭が
 *   一致しない → WCAG 2.5.3 (Label in Name) 推奨形に未到達。同 3 button の visible
 *   text も span aria-hidden 未統合だった。iter857 で workflows-panel 同 pattern を
 *   適合化済、本 file が並走未対応で残っていた → 一括解消。
 *
 * fix (1 ファイル、3 button 一括 ~8 行差分):
 *   - 各 aria-label を visible text prefix 形に変更 (Pull / 無効化(有効化) / 履歴 →
 *     「<動詞> (Source「N」…)」 形)。pending 時も「中…」 prefix。
 *   - 同時に各 visible text を <span aria-hidden="true"> で wrap、aria-label 単独
 *     経路に統一 (iter844-857 と一貫)。
 *
 * 検証: source-side regex assert + iter850/853/856/857 invariant cross-check。
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

  // 1. src-pull aria-label visible "Pull" / "Pull 中…" prefix + aria-hidden
  if (
    /aria-label=\{[\s\S]+?`Pull \(Source「\$\{src\.name\}」を手動 Pull、sync 実行、30s timeout\)`/.test(
      ip,
    ) &&
    /aria-label=\{[\s\S]+?`Pull 中… \(Source「\$\{src\.name\}」\)`/.test(ip)
  ) {
    findings.push({
      level: 'info',
      message: `src-pull aria-label visible "Pull" / "Pull 中…" prefix OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `src-pull aria-label NG` })
  }
  if (/<span aria-hidden="true">\{trigger\.isPending \? 'Pull 中…' : 'Pull'\}<\/span>/.test(ip)) {
    findings.push({
      level: 'info',
      message: `src-pull visible Pull(中…) span aria-hidden OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `src-pull aria-hidden NG` })
  }

  // 2. src-toggle aria-label visible 無効化(有効化) prefix + aria-hidden
  if (
    /aria-label=\{[\s\S]+?`\$\{src\.enabled \? '無効化' : '有効化'\} \(Source「\$\{src\.name\}」\)`/.test(
      ip,
    )
  ) {
    findings.push({
      level: 'info',
      message: `src-toggle aria-label visible 無効化(有効化) prefix OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `src-toggle aria-label NG` })
  }
  if (/<span aria-hidden="true">\{src\.enabled \? '無効化' : '有効化'\}<\/span>/.test(ip)) {
    findings.push({
      level: 'info',
      message: `src-toggle visible 無効化(有効化) span aria-hidden OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `src-toggle aria-hidden NG` })
  }

  // 3. src-imports-toggle aria-label visible "履歴" prefix + aria-hidden
  if (
    /aria-label=\{[\s\S]+?`履歴 \(Source「\$\{src\.name\}」の Pull 履歴 直近 5 件を表示\)`/.test(ip)
  ) {
    findings.push({
      level: 'info',
      message: `src-imports-toggle aria-label visible "履歴" prefix OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `src-imports-toggle aria-label NG` })
  }
  if (/<span aria-hidden="true">履歴<\/span>/.test(ip)) {
    findings.push({
      level: 'info',
      message: `src-imports-toggle visible "履歴" span aria-hidden OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `src-imports-toggle aria-hidden NG` })
  }

  // iter857 invariant: workflows-panel buttons aria-hidden
  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">編集<\/span>/.test(wp) &&
    /<span aria-hidden="true">履歴<\/span>/.test(wp)
  ) {
    findings.push({
      level: 'info',
      message: `iter857 invariant: workflows-panel button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter857 invariant: 破壊` })
  }

  // iter856 invariant: sprint status buttons aria-hidden
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">期間<\/span>/.test(sp) &&
    /<span aria-hidden="true">中止<\/span>/.test(sp)
  ) {
    findings.push({
      level: 'info',
      message: `iter856 invariant: sprint status button aria-hidden 維持 OK`,
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

  console.log(`\n=== Findings (integrations-source-buttons-label-in-name-iter858) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
