/**
 * Phase 6.15 loop iter 897 (mode-D Desktop a11y) —
 * workspace page 内 "← 一覧" Link の visible aria-hidden 統合 + WCAG 2.5.3 適合化。
 *
 * 課題: src/app/(workspace)/[workspaceId]/page.tsx の Workspace 一覧 Link は visible
 *   "← 一覧" (← icon + " 一覧") に対し旧 aria-label "Workspace 一覧へ戻る" は visible 部分の
 *   "←" を含まず + 「一覧」 の前後に "Workspace " と "へ戻る" が挿入されて substring 不適合
 *   → WCAG 2.5.3 違反 (略 "← " icon 視覚装飾 + 「一覧」 が core 名詞)。iter891 の swimlane
 *   summary と同 pattern で aria-label を visible prefix 形に変更。
 *
 * fix (1 ファイル / +2-2 行差分):
 *   - aria-label を `一覧 (Workspace 一覧へ戻る)` 形に変更し visible "一覧" prefix 適合化
 *   - <Link><span aria-hidden="true">← </span>一覧</Link> →
 *     <Link><span aria-hidden="true">← 一覧</span></Link> で全 visible を aria-hidden に統合
 *
 * 検証: source-side regex assert + iter895/896 invariant cross-check。
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
    resolve(process.cwd(), 'src/app/(workspace)/[workspaceId]/page.tsx'),
    'utf8',
  )

  // 1. aria-label に "一覧" prefix
  if (/aria-label="一覧 \(Workspace 一覧へ戻る\)"/.test(wp)) {
    findings.push({
      level: 'info',
      message: `workspace 一覧 Link aria-label に "一覧" prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `workspace 一覧 Link aria-label が "一覧" prefix 不含`,
    })
  }

  // 2. visible "← 一覧" 全体 aria-hidden 統合
  if (/<span aria-hidden="true">← 一覧<\/span>/.test(wp)) {
    findings.push({
      level: 'info',
      message: `workspace 一覧 Link visible "← 一覧" 全体 aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `workspace 一覧 Link visible aria-hidden 未統合`,
    })
  }

  // 3. 旧 aria-label "Workspace 一覧へ戻る" 削除
  if (!/aria-label="Workspace 一覧へ戻る"/.test(wp)) {
    findings.push({
      level: 'info',
      message: `workspace 一覧 Link 旧 aria-label 削除済 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `workspace 一覧 Link 旧 aria-label 残存` })
  }

  // iter896 invariant: period-goal-save aria-label
  const pp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/personal-period-view.tsx'),
    'utf8',
  )
  if (/`ゴール保存 \(\$\{periodLabelJa\(period\)\}のゴール文を保存\)`/.test(pp)) {
    findings.push({
      level: 'info',
      message: `iter896 invariant: period-goal-save aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter896 invariant: period-goal-save 破壊` })
  }

  console.log(`\n=== Findings (workspace-back-link-aria-hidden-iter897) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
