/**
 * Phase 6.15 loop iter 859 (mode-D Desktop a11y) —
 * goals-panel Goal Card ステータス操作 5 visible label を aria-hidden span で wrap (一括).
 *
 * 課題: src/components/workspace/goals-panel.tsx の Goal Card 内 ステータス操作 button
 *   - "完了"           (status=active 時、1 callsite)
 *   - "アーカイブ"     (status=active / completed 時、2 callsite)
 *   - "active に戻す"  (status=completed / archived 時、2 callsite)
 * 合計 5 visible label。各々 aria-label に完全 content (Goal title + action) を含むのに、
 * 内側 visible text は aria-hidden 無し → SR ユーザに aria-label + visible 重複読み上げ。
 * iter844-858 sweep の続編で 5 callsite 一括対応。
 *
 * fix (1 ファイル ~5 行差分):
 *   - 「完了」 / 「アーカイブ」 ×2 / 「active に戻す」 ×2 を <span aria-hidden="true"> で wrap
 *   - aria-label 単独経路に統一、button 機能不変、visual layout 不変
 *
 * 検証: source-side regex assert + iter735-858 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )

  // 1. "完了" visible aria-hidden span (1 callsite)
  if (/<span aria-hidden="true">完了<\/span>/.test(gp)) {
    findings.push({
      level: 'info',
      message: `goal-status「完了」 visible span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `goal-status「完了」 visible aria-hidden 未統合`,
    })
  }

  // 2. "アーカイブ" visible aria-hidden span (2 callsite)
  const archHidden = gp.match(/<span aria-hidden="true">アーカイブ<\/span>/g) ?? []
  if (archHidden.length >= 2) {
    findings.push({
      level: 'info',
      message: `goal-status「アーカイブ」 visible span aria-hidden 統合 OK (${archHidden.length} 箇所)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `goal-status「アーカイブ」 visible aria-hidden 未統合 (${archHidden.length} 箇所)`,
    })
  }

  // 3. "active に戻す" visible aria-hidden span (2 callsite)
  const activeHidden = gp.match(/<span aria-hidden="true">active に戻す<\/span>/g) ?? []
  if (activeHidden.length >= 2) {
    findings.push({
      level: 'info',
      message: `goal-status「active に戻す」 visible span aria-hidden 統合 OK (${activeHidden.length} 箇所)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `goal-status「active に戻す」 visible aria-hidden 未統合 (${activeHidden.length} 箇所)`,
    })
  }

  // 4. button aria-label 維持 (regression 防止) — 各 label を個別カウント
  const labelCounts = {
    完了: (gp.match(/`Goal「\$\{goal\.title\}」を完了`/g) ?? []).length,
    アーカイブ: (gp.match(/`Goal「\$\{goal\.title\}」をアーカイブ`/g) ?? []).length,
    activeに戻す: (gp.match(/`Goal「\$\{goal\.title\}」を active に戻す`/g) ?? []).length,
  }
  if (labelCounts.完了 >= 1 && labelCounts.アーカイブ >= 2 && labelCounts.activeに戻す >= 2) {
    findings.push({
      level: 'info',
      message: `goal-status button aria-label 維持 OK (完了 ${labelCounts.完了} / アーカイブ ${labelCounts.アーカイブ} / active に戻す ${labelCounts.activeに戻す})`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `goal-status button aria-label regression (完了 ${labelCounts.完了} / アーカイブ ${labelCounts.アーカイブ} / active に戻す ${labelCounts.activeに戻す})`,
    })
  }

  // 5. iter858 invariant: sprint-card action 7 button aria-hidden
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  const sprintActionTags = ['期間', '稼働開始', '完了', '計画に戻す', '中止']
  const allPresent = sprintActionTags.every((lbl) =>
    new RegExp(`<span aria-hidden="true">${lbl}</span>`).test(sp),
  )
  if (allPresent) {
    findings.push({
      level: 'info',
      message: `iter858 invariant: sprint-card 5 静的 action aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter858 invariant: 破壊` })
  }

  // 6. iter857 invariant: op-board 昨日 done aria-hidden
  const op = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">昨日 done \{board\.doneYesterday\.count\} 件<\/span>/.test(op)) {
    findings.push({
      level: 'info',
      message: `iter857 invariant: op-board 昨日 done aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter857 invariant: 破壊` })
  }

  // 7. iter735 invariant: team-context-editor aria-keyshortcuts
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter735 invariant: team-context-editor aria-keyshortcuts 維持 OK (${tceMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant: 破壊` })
  }

  console.log(`\n=== Findings (goal-status-buttons-aria-hidden-iter859) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
