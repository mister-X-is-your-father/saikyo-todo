/**
 * Phase 6.15 loop iter 863 (mode-D Desktop a11y) —
 * workflows-panel.tsx Workflow card 3 button (編集 / 無効化-有効化 / 履歴) 内
 * visible text を aria-hidden span で wrap (iter800-862 sweep の続編、iter838
 * で実行 + 作成 button を fix した続編)。
 *
 * 課題: workflows-panel.tsx 行 349 / 365 / 386 の 3 Button は各 aria-label が完全
 *   content (Workflow 名 + 動作内容) を含むのに、内側 visible text (編集 /
 *   有効化-無効化 / 履歴) は aria-hidden 無し → SR で二重読み可能性。
 *   Workflow card 1 row につき 5 button (実行 / 編集 / 有効化-無効化 / 履歴 /
 *   削除) のうち実行 + 作成は iter838 で fix 済、削除 は icon-only。残 3 button を
 *   一括統一。
 *
 * fix (1 ファイル ~3 行差分):
 *   - 編集 button "編集" 内 text を <span aria-hidden="true"> で wrap
 *   - 有効化/無効化 button "{toggle}" 内 text を <span aria-hidden="true"> で wrap
 *   - 履歴 button "履歴" 内 text を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter735/860/861/862 invariant cross-check。
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
  const editHidden = /<span aria-hidden="true">編集<\/span>/.test(wp)
  const toggleHidden =
    /<span aria-hidden="true">\{wf\.enabled \? '無効化' : '有効化'\}<\/span>/.test(wp)
  const historyHidden = /<span aria-hidden="true">履歴<\/span>/.test(wp)
  if (editHidden && toggleHidden && historyHidden) {
    findings.push({
      level: 'info',
      message: `iter863: workflows-panel 編集 / 有効化-無効化 / 履歴 button aria-hidden span OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter863: 不完全 (edit=${editHidden} toggle=${toggleHidden} history=${historyHidden})`,
    })
  }

  // iter862 invariant: activity-log actor badge aria-hidden 維持
  const al = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/activity-log.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{entry\.actorType === 'agent' \? 'AI' : 'user'\}<\/span>/.test(al)
  ) {
    findings.push({
      level: 'info',
      message: `iter862 invariant: activity-log actor badge aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter862 invariant: 破壊` })
  }

  // iter861 invariant: sprint-swimlane load summary aria-hidden 維持
  const ssd = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprint-swimlane-disclosure.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{row\.loadSummaryJa\}<\/span>/.test(ssd)) {
    findings.push({
      level: 'info',
      message: `iter861 invariant: sprint-swimlane load summary aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter861 invariant: 破壊` })
  }

  // iter860 invariant: top-items-by-time-chip aria-hidden 維持
  const ti = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/top-items-by-time-chip.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{label\}<\/span>/.test(ti) &&
    /<span aria-hidden="true">\{row\.entryCount\} 件<\/span>/.test(ti)
  ) {
    findings.push({
      level: 'info',
      message: `iter860 invariant: top-items-by-time-chip aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter860 invariant: 破壊` })
  }

  // iter735 invariant: shadcn UI 未編集
  const tabs = readFileSync(resolve(process.cwd(), 'src/components/ui/tabs.tsx'), 'utf8')
  if (!/aria-hidden/.test(tabs)) {
    findings.push({ level: 'info', message: `iter735 invariant: shadcn/tabs.tsx 未編集 OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `iter735 invariant: shadcn tabs.tsx に aria-hidden 編集が混入`,
    })
  }

  console.log(`\n=== Findings (iter863) ===`)
  if (findings.length === 0) console.log('(なし)')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
