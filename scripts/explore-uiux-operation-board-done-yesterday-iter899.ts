/**
 * Phase 6.15 loop iter 899 (mode-D Desktop a11y) —
 * operation-board-widget done-yesterday-toggle button: visible "昨日 done {N} 件"
 * を span aria-hidden で wrap (campaign 統合)。
 *
 * 課題: src/components/workspace/operation-board-widget.tsx の
 *   operation-board-done-yesterday-toggle button は aria-label "昨日 done {N} 件の一覧を
 *   表示/閉じる" が visible "昨日 done {N} 件" の prefix として substring 適合だったが、
 *   iter844-898 campaign 規約 (visible aria-hidden 単独経路) から外れていた。
 *
 * fix (1 ファイル / +1-1 行差分):
 *   - <button>...昨日 done {count} 件</button> → <button>...<span aria-hidden="true">昨日 done {count} 件</span></button>
 *
 * 検証: source-side regex assert + iter897/898 invariant cross-check。
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

  // 1. visible "昨日 done {count} 件" span aria-hidden
  if (/<span aria-hidden="true">昨日 done \{board\.doneYesterday\.count\} 件<\/span>/.test(ob)) {
    findings.push({
      level: 'info',
      message: `operation-board-done-yesterday-toggle visible span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `operation-board-done-yesterday-toggle visible aria-hidden 未統合`,
    })
  }

  // 2. aria-label 維持
  if (
    /aria-label=\{[\s\S]+?`昨日 done \$\{board\.doneYesterday\.count\} 件の一覧を閉じる`[\s\S]+?`昨日 done \$\{board\.doneYesterday\.count\} 件の一覧を表示`/.test(
      ob,
    )
  ) {
    findings.push({
      level: 'info',
      message: `operation-board-done-yesterday-toggle aria-label 両状態維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `operation-board-done-yesterday-toggle aria-label 破壊`,
    })
  }

  // iter898 invariant: team-capacity-summary
  const tc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-capacity-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">チームメンバー 余裕時間 \(今日 \/ 今週\)<\/span>/.test(tc)) {
    findings.push({
      level: 'info',
      message: `iter898 invariant: team-capacity-summary aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter898 invariant: team-capacity-summary 破壊` })
  }

  // iter897 invariant: workspace 一覧 Link
  const wp = readFileSync(
    resolve(process.cwd(), 'src/app/(workspace)/[workspaceId]/page.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">← 一覧<\/span>/.test(wp)) {
    findings.push({
      level: 'info',
      message: `iter897 invariant: workspace 一覧 Link aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter897 invariant: workspace 一覧 Link 破壊` })
  }

  console.log(`\n=== Findings (operation-board-done-yesterday-iter899) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
