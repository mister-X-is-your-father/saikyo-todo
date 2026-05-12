/**
 * Phase 6.15 loop iter 870 (mode-D Desktop a11y) —
 * sprint-swimlane-disclosure.tsx <summary> 内 visible "担当者ビュー (swim-lane Gantt)"
 * を aria-hidden span で wrap (iter800-869 sweep の続編)。
 *
 * 課題: sprint-swimlane-disclosure.tsx 行 58-69 の summary 要素は aria-label が
 *   完全 content (Sprint 名 + 動作 + open/close) を含むのに、内側 visible
 *   "担当者ビュー (swim-lane Gantt)" text は aria-hidden 無し → SR で二重読み。
 *   Sprint card 内の disclosure トリガ。
 *
 * fix (1 ファイル ~1 行差分):
 *   - visible "担当者ビュー (swim-lane Gantt)" を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter735/867/868/869 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ssd = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprint-swimlane-disclosure.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">担当者ビュー \(swim-lane Gantt\)<\/span>/.test(ssd)) {
    findings.push({
      level: 'info',
      message: `iter870: sprint-swimlane summary aria-hidden span OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter870: swimlane summary aria-hidden 不在`,
    })
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

  // iter867 invariant: goals-panel status button aria-hidden 維持
  if (
    /<span aria-hidden="true">完了<\/span>/.test(gp) &&
    /<span aria-hidden="true">アーカイブ<\/span>/.test(gp)
  ) {
    findings.push({
      level: 'info',
      message: `iter867 invariant: goals-panel status button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter867 invariant: 破壊` })
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

  console.log(`\n=== Findings (iter870) ===`)
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
