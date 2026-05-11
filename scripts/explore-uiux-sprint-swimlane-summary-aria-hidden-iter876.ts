/**
 * Phase 6.15 loop iter 876 (mode-D Desktop a11y / iter826+ pattern catch-up) —
 * sprint-swimlane-disclosure.tsx の summary 「担当者ビュー」 visible text を aria-hidden span に統合。
 *
 * 課題: src/components/workspace/sprint-swimlane-disclosure.tsx の <details><summary> の
 *   visible "担当者ビュー (swim-lane Gantt)" は直接 children として出していたが、aria-label が
 *   完全 content ('Sprint「name」の担当者 swim-lane Gantt を 開く / 閉じる') を含むのに
 *   aria-hidden 無し → SR 再 announce、Sprint カード内 disclosure 操作の頻繁 path。
 *
 * fix (1 ファイル 1 行差分):
 *   - <span aria-hidden="true">担当者ビュー (swim-lane Gantt)</span> で wrap
 *
 * 検証: source-side regex assert + iter875/874/873/851 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const sd = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprint-swimlane-disclosure.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">担当者ビュー \(swim-lane Gantt\)<\/span>/.test(sd)) {
    findings.push({
      level: 'info',
      message: `sprint-swimlane-disclosure summary 「担当者ビュー」 aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-swimlane-disclosure summary 未統合`,
    })
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

  // iter874 invariant
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{upd\.isPending \? '保存中…' : '保存'\}<\/span>/.test(tce)) {
    findings.push({
      level: 'info',
      message: `iter874 invariant: team-context-editor 保存 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter874 invariant: 破壊` })
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

  console.log(`\n=== Findings (sprint-swimlane-summary-aria-hidden-iter876) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
