/**
 * Phase 6.15 loop iter 448 (mode-D Desktop a11y) — SprintsPanel の `<ul
 * data-testid="sprints-list">` に aria-label を追加 (iter447 CommentThread と
 * 同 pattern 9 件目水平展開)、codify。
 *
 * 課題: src/components/workspace/sprints-panel.tsx:
 *   ```tsx
 *   <ul className="space-y-3" data-testid="sprints-list">
 *     {list.data.map((sp) => (...))}
 *   </ul>
 *   ```
 *   `<ul>` に aria-label/aria-labelledby が無く、SR の list nav で件数のみが
 *   伝わって context (= "Sprint 一覧") が伝わらない。
 *
 * fix: 1 ファイル ~6 行差分 (コメント込み)。
 *   - `<ul>` に `aria-label="Sprint 一覧 ${list.data.length} 件"` を配線
 *
 * 機能追加なし、視覚 layout 不変、shadcn 編集なし。
 *
 * 検証: source-side regex assert + iter447 CommentThread pattern consistency。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const path = 'src/components/workspace/sprints-panel.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // 1. ul aria-label 配線
  if (
    /<ul[\s\S]{0,200}?data-testid="sprints-list"[\s\S]{0,200}?aria-label=\{`Sprint 一覧 \$\{list\.data\.length\} 件`\}/.test(
      src,
    )
  ) {
    findings.push({
      level: 'info',
      message: `${path}: <ul sprints-list> aria-label 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: <ul sprints-list> aria-label 配線 不在`,
    })
  }

  // 2. iter447 CommentThread invariant 維持
  const commentSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/comment-thread.tsx'),
    'utf8',
  )
  if (/aria-label=\{`コメント一覧 \$\{comments!\.length\} 件`\}/.test(commentSrc)) {
    findings.push({
      level: 'info',
      message: `comment-thread: iter447 ul aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `comment-thread: iter447 ul aria-label 消えた (regression)`,
    })
  }

  console.log(`\n=== Findings (sprints-list-aria-iter448) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
