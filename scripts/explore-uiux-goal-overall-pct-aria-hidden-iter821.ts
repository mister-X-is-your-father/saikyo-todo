/**
 * Phase 6.15 loop iter 821 (mode-D Desktop a11y) —
 * goals-panel Goal 全体進捗 visible "{goalPct}%" span を aria-hidden 化 (iter819 + iter820 同 pattern)。
 *
 * 課題: goals-panel.tsx 行 422-432 の Goal 全体進捗 visible % span は sibling
 *   progressbar (行 434-) の aria-label / aria-valuetext に同じ情報が含まれているのに
 *   aria-hidden 無し。iter819 sprint-card / iter820 KR row 同 pattern を Goal 全体進捗
 *   にも展開。
 *
 * fix (1 ファイル ~1 行差分):
 *   - 完了率 visible span に aria-hidden="true" 追加
 *
 * 検証: source-side regex assert + iter735-820 invariant cross-check。
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
  const hasOverallAriaHidden =
    /\}`\}\s*\n?\s*aria-hidden="true"\s*\n?\s*>\s*\n?\s*\{goalPct\}%/.test(gp)
  if (hasOverallAriaHidden) {
    findings.push({
      level: 'info',
      message: `Goal 全体進捗 visible % span aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `Goal 全体進捗 visible % aria-hidden 不完全`,
    })
  }

  // iter820 invariant: KR row visible % aria-hidden
  if (
    /<span className="font-mono text-xs" aria-hidden="true">\s*\n?\s*\{pct\}%\s*\n?\s*<\/span>/.test(
      gp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter820 invariant: KR row visible % aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter820 invariant: 破壊` })
  }

  // iter819 invariant: sprint progress visible % chip aria-hidden
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (
    /\}`\}\s*\n?\s*aria-hidden="true"\s*\n?\s*>\s*\n?\s*\{done\} \/ \{total\} \(\{pct\}%\)/.test(sp)
  ) {
    findings.push({
      level: 'info',
      message: `iter819 invariant: sprint progress visible % aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter819 invariant: 破壊` })
  }

  // iter816 invariant: backlog estimate summary aria-hidden
  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{estimateSummary\}<\/span>/.test(bv)) {
    findings.push({
      level: 'info',
      message: `iter816 invariant: backlog estimate summary aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter816 invariant: 破壊` })
  }

  // iter735 invariant: team-context-editor
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

  console.log(`\n=== Findings (goal-overall-pct-aria-hidden-iter821) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
