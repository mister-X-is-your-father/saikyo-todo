/**
 * Phase 6.15 loop iter 756 (mode-D Desktop a11y) —
 * decompose-proposals-panel の Researcher 完了後 0 件 empty state p に
 * role="status" + aria-live="polite" を追加 (iter752/755 sweep の続き)。
 *
 * 課題: decompose-proposals-panel.tsx 行 147-151 の empty p は role/aria-live なし。
 *   Researcher 実行後に「提案 0 件で完了」した瞬間 (動的状態遷移) に SR ユーザは
 *   「提案が出ませんでした」 という重要情報を automatic announce しない。
 *   completedWithNoProposals = true の transition は AI agent run の終結を意味するので
 *   live region で告知すべき。
 *
 * fix (1 ファイル ~5 行差分):
 *   - empty p に `role="status"` + `aria-live="polite"` を追加
 *
 * 検証: source-side regex assert + iter735-755 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const dpp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  const hasStatus =
    /data-testid="proposals-empty-msg"\s*\n\s*role="status"\s*\n\s*aria-live="polite"/.test(dpp)
  if (hasStatus) {
    findings.push({
      level: 'info',
      message: `decompose-proposals empty state p role/aria-live 追加 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `decompose-proposals empty state p role/aria-live 追加 不完全`,
    })
  }

  // iter755 invariant: diff-summary-bar empty state aria-live
  const dsb = readFileSync(
    resolve(process.cwd(), 'src/components/schedule/diff-summary-bar.tsx'),
    'utf8',
  )
  if (
    /<div className="text-muted-foreground py-2 text-xs" role="status" aria-live="polite">/.test(
      dsb,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter755 invariant: diff-summary-bar empty state aria-live 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter755 invariant: 破壊` })
  }

  // iter752 invariant: backlog-view empty state aria-live
  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )
  if (/role="status"\s*\n\s*aria-live="polite"/.test(bv)) {
    findings.push({
      level: 'info',
      message: `iter752 invariant: backlog-view empty state aria-live 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter752 invariant: 破壊` })
  }

  // iter748 invariant: gantt-view summary aria-label
  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')
  if (
    /aria-label=\{`critical path \$\{criticalCount\} 件 \(project 全体期間に直接影響、遅延すると全体遅延\)`\}/.test(
      gv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter748 invariant: gantt critical aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter748 invariant: 破壊` })
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

  console.log(`\n=== Findings (decompose-empty-aria-iter756) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
