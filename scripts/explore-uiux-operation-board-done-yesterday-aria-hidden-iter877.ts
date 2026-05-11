/**
 * Phase 6.15 loop iter 877 (mode-D Desktop a11y / iter826+ pattern catch-up) —
 * operation-board-widget.tsx の 「昨日 done N 件」 disclosure visible を aria-hidden span に統合。
 *
 * 課題: src/components/workspace/operation-board-widget.tsx の line 298 disclosure button は
 *   visible "昨日 done {count} 件" を直接 children として出していたが、aria-label が
 *   完全 content ('昨日 done ${count} 件の一覧を 表示 / 閉じる') を含むのに aria-hidden 無し
 *   → SR 再 announce。Today widget の disclosure 操作は朝 brief 時頻繁。
 *
 * fix (1 ファイル 1 行差分):
 *   - <span aria-hidden="true">昨日 done {count} 件</span> で wrap
 *
 * 検証: source-side regex assert + iter876/875/874/851 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ob = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">昨日 done \{board\.doneYesterday\.count\} 件<\/span>/.test(ob)) {
    findings.push({
      level: 'info',
      message: `operation-board-widget 昨日 done disclosure aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `operation-board-widget 昨日 done disclosure 未統合`,
    })
  }

  // iter876 invariant
  const ssd = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprint-swimlane-disclosure.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">担当者ビュー \(swim-lane Gantt\)<\/span>/.test(ssd)) {
    findings.push({
      level: 'info',
      message: `iter876 invariant: sprint-swimlane-disclosure 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter876 invariant: 破壊` })
  }

  // iter875 invariant
  const pp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/personal-period-view.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{upsertGoal\.isPending \? '保存中…' : 'ゴール保存'\}<\/span>/.test(
      pp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter875 invariant: personal-period-view ゴール保存 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter875 invariant: 破壊` })
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

  console.log(`\n=== Findings (operation-board-done-yesterday-aria-hidden-iter877) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
