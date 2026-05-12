/**
 * Phase 6.15 loop iter 856 (mode-D Desktop a11y) —
 * sprints-panel status 遷移 + 期間 button 群 (5 件): WCAG 2.5.3 (Label in Name) 一括適合。
 *
 * 課題: src/components/workspace/sprints-panel.tsx の 5 button (sprint-period-edit-btn /
 *   sprint-activate / sprint-complete / 計画に戻す (testid 無) / sprint-cancel) は
 *   visible "期間" / "稼働開始" / "完了" / "計画に戻す" / "中止" がいずれも旧 aria-label
 *   "Sprint「N」を…" の suffix substring としては含まれるが prefix では無く voice user
 *   発話と name 先頭が一致しない → WCAG 2.5.3 (Label in Name) 推奨形に未到達。
 *   iter844-855 で同 file の AI button 2 件は適合化済、status 遷移系 5 件が残る。
 *
 * fix (1 ファイル、5 button 一括 ~15 行差分):
 *   - 各 aria-label を visible text prefix 形に変更 (例: 「期間 (Sprint「N」の期間を編集)」、
 *     「稼働開始 (Sprint「N」)」、「完了 (Sprint「N」)」、「計画に戻す (Sprint「N」)」、
 *     「中止 (Sprint「N」)」)。
 *   - 同時に各 visible text を <span aria-hidden="true"> で wrap、aria-label 単独経路に
 *     統一 (iter844-855 と一貫)。CalendarRange / Play / CheckCircle / Pause / X icon は
 *     既に aria-hidden 維持。
 *   - changing (pending) 時は「<動詞> 中… (Sprint「N」)」 形で prefix を保持。
 *
 * 検証: source-side regex assert + iter849/850/853/854/855 invariant cross-check。
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

  // 1. sprint-period-edit-btn: visible "期間" prefix + aria-hidden
  if (/aria-label=\{`期間 \(Sprint「\$\{sprint\.name\}」の期間を編集\)`\}/.test(sp)) {
    findings.push({
      level: 'info',
      message: `sprint-period-edit-btn aria-label visible "期間" prefix OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `sprint-period-edit-btn aria-label NG` })
  }
  if (/<span aria-hidden="true">期間<\/span>/.test(sp)) {
    findings.push({
      level: 'info',
      message: `sprint-period-edit-btn visible "期間" span aria-hidden OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `sprint-period-edit-btn aria-hidden NG` })
  }

  // 2. sprint-activate: visible "稼働開始" prefix + aria-hidden
  if (/aria-label=\{[\s\S]+?`稼働開始 \(Sprint「\$\{sprint\.name\}」\)`/.test(sp)) {
    findings.push({
      level: 'info',
      message: `sprint-activate aria-label visible "稼働開始" prefix OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `sprint-activate aria-label NG` })
  }
  if (/<span aria-hidden="true">稼働開始<\/span>/.test(sp)) {
    findings.push({
      level: 'info',
      message: `sprint-activate visible "稼働開始" span aria-hidden OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `sprint-activate aria-hidden NG` })
  }

  // 3. sprint-complete: visible "完了" prefix + aria-hidden
  if (/aria-label=\{[\s\S]+?`完了 \(Sprint「\$\{sprint\.name\}」\)`/.test(sp)) {
    findings.push({
      level: 'info',
      message: `sprint-complete aria-label visible "完了" prefix OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `sprint-complete aria-label NG` })
  }
  if (/<span aria-hidden="true">完了<\/span>/.test(sp)) {
    findings.push({
      level: 'info',
      message: `sprint-complete visible "完了" span aria-hidden OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `sprint-complete aria-hidden NG` })
  }

  // 4. 計画に戻す: visible "計画に戻す" prefix + aria-hidden
  if (/aria-label=\{[\s\S]+?`計画に戻す \(Sprint「\$\{sprint\.name\}」\)`/.test(sp)) {
    findings.push({
      level: 'info',
      message: `sprint plan-revert aria-label visible "計画に戻す" prefix OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `sprint plan-revert aria-label NG` })
  }
  if (/<span aria-hidden="true">計画に戻す<\/span>/.test(sp)) {
    findings.push({
      level: 'info',
      message: `sprint plan-revert visible "計画に戻す" span aria-hidden OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `sprint plan-revert aria-hidden NG` })
  }

  // 5. sprint-cancel: visible "中止" prefix + aria-hidden
  if (/aria-label=\{[\s\S]+?`中止 \(Sprint「\$\{sprint\.name\}」\)`/.test(sp)) {
    findings.push({
      level: 'info',
      message: `sprint-cancel aria-label visible "中止" prefix OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `sprint-cancel aria-label NG` })
  }
  if (/<span aria-hidden="true">中止<\/span>/.test(sp)) {
    findings.push({
      level: 'info',
      message: `sprint-cancel visible "中止" span aria-hidden OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `sprint-cancel aria-hidden NG` })
  }

  // iter855 invariant: premortem visible aria-hidden
  if (
    /data-testid=\{`sprint-premortem-\$\{sprint\.id\}`\}[\s\S]+?<span aria-hidden="true">[\s\S]+?premortemPending[\s\S]+?<\/span>/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter855 invariant: premortem visible aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter855 invariant: 破壊` })
  }

  // iter854 invariant: retro visible aria-hidden
  if (
    /data-testid=\{`sprint-retro-\$\{sprint\.id\}`\}[\s\S]+?<span aria-hidden="true">[\s\S]+?retroPending[\s\S]+?<\/span>/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter854 invariant: retro visible aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter854 invariant: 破壊` })
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

  console.log(`\n=== Findings (sprint-status-label-in-name-iter856) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
