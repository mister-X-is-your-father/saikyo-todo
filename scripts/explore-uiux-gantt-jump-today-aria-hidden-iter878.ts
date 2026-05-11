/**
 * Phase 6.15 loop iter 878 (mode-D Desktop a11y / iter826+ pattern catch-up) —
 * gantt-view.tsx の 「今日へジャンプ」 button visible を aria-hidden span に統合。
 *
 * 課題: src/components/workspace/gantt-view.tsx line 405 「今日へジャンプ」 raw button は
 *   visible "今日へジャンプ" 直接 children だったが、aria-label が完全 content
 *   ('Gantt timeline を今日 (${date}) の縦線まで横スクロール') を含むのに aria-hidden 無し
 *   → SR 再 announce、Gantt 操作 path の頻繁 navigation。
 *
 * fix (1 ファイル 1 行差分):
 *   - <span aria-hidden="true">今日へジャンプ</span> で wrap
 *
 * 検証: source-side regex assert + iter877/876/875/851 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')
  if (/<span aria-hidden="true">今日へジャンプ<\/span>/.test(gv)) {
    findings.push({
      level: 'info',
      message: `gantt-view 「今日へジャンプ」 aria-hidden 統合 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `gantt-view 「今日へジャンプ」 未統合` })
  }

  // iter877 invariant
  const ob = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">昨日 done \{board\.doneYesterday\.count\} 件<\/span>/.test(ob)) {
    findings.push({
      level: 'info',
      message: `iter877 invariant: operation-board-widget 昨日 done 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter877 invariant: 破壊` })
  }

  // iter876 invariant
  const ssd = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprint-swimlane-disclosure.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">担当者ビュー \(swim-lane Gantt\)<\/span>/.test(ssd)) {
    findings.push({
      level: 'info',
      message: `iter876 invariant: sprint-swimlane 担当者ビュー 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter876 invariant: 破壊` })
  }

  // iter851 invariant
  const layout = readFileSync(resolve(process.cwd(), 'src/app/layout.tsx'), 'utf8')
  if (
    /focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:inline-flex focus:min-h-11/.test(
      layout,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter851 invariant: skip-link focus min-h-11 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter851 invariant: 破壊` })
  }

  console.log(`\n=== Findings (gantt-jump-today-aria-hidden-iter878) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
