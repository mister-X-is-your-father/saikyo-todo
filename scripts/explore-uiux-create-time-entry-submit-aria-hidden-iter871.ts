/**
 * Phase 6.15 loop iter 871 (mode-D Desktop a11y) —
 * create-time-entry-form.tsx submit button 内 visible "記録" / "..." を
 * aria-hidden span で wrap (iter800-870 sweep の続編)。
 *
 * 課題: create-time-entry-form.tsx 行 171 の submit Button は aria-label が完全
 *   content (稼働記録を作成 / 作成中…) を含むのに、内側 visible "記録" / "..."
 *   は aria-hidden 無し。visible "..." は aria-label "作成中…" と vocabulary
 *   乖離だが、aria-label が canonical なので問題なし。aria-hidden で SR 読み
 *   分離を明確化。iter844-846 と同 submit pattern。
 *
 * fix (1 ファイル ~1 行差分):
 *   - visible "{...} / {記録}" を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter735/868/869/870 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const cef = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/create-time-entry-form.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{create\.isPending \? '\.\.\.' : '記録'\}<\/span>/.test(cef)) {
    findings.push({
      level: 'info',
      message: `iter871: create-time-entry submit button aria-hidden span OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter871: create-time-entry submit aria-hidden 不在`,
    })
  }

  // iter870 invariant: sprint-swimlane summary aria-hidden 維持
  const ssd = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprint-swimlane-disclosure.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">担当者ビュー \(swim-lane Gantt\)<\/span>/.test(ssd)) {
    findings.push({
      level: 'info',
      message: `iter870 invariant: sprint-swimlane summary aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter870 invariant: 破壊` })
  }

  // iter869 invariant: goals-panel KR 追加 aria-hidden 維持
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">KR 追加<\/span>/.test(gp)) {
    findings.push({
      level: 'info',
      message: `iter869 invariant: goals-panel KR 追加 aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter869 invariant: 破壊` })
  }

  // iter868 invariant: sprints-panel 9 button aria-hidden 維持
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">期間<\/span>/.test(sp) &&
    /<span aria-hidden="true">稼働開始<\/span>/.test(sp)
  ) {
    findings.push({
      level: 'info',
      message: `iter868 invariant: sprints-panel 9 button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter868 invariant: 破壊` })
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

  console.log(`\n=== Findings (iter871) ===`)
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
