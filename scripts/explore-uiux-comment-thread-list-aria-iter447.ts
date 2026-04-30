/**
 * Phase 6.15 loop iter 447 (mode-D Desktop a11y) — CommentThread の `<ul>`
 * comment list に aria-label を追加 (iter427 / iter428 / iter438 と同 pattern
 * 8 件目水平展開、SR list navigation で「コメント一覧 N 件」 が context として
 * 伝わるように)、codify。
 *
 * 課題: src/components/workspace/comment-thread.tsx の comment list:
 *   ```tsx
 *   <ul className="space-y-3">
 *     {comments!.map((c) => (...))}
 *   </ul>
 *   ```
 *   `<ul>` 自体に aria-label/aria-labelledby が無く、SR の list nav で件数の
 *   みが伝わって context (= "コメント一覧") が伝わらない。
 *
 * fix: 1 ファイル ~3 行差分 (コメント込み)。
 *   - `<ul>` に `aria-label="コメント一覧 ${comments.length} 件"` を配線
 *   - 動的 count で list nav で「コメント一覧 5 件」 と聞き取れる
 *
 * 機能追加なし、視覚 layout 不変、shadcn 編集なし。
 *
 * 検証: source-side regex assert で codify。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const path = 'src/components/workspace/comment-thread.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // 1. ul aria-label 配線
  if (
    /<ul className="space-y-3" aria-label=\{`コメント一覧 \$\{comments!\.length\} 件`\}/.test(src)
  ) {
    findings.push({
      level: 'info',
      message: `${path}: <ul> aria-label="コメント一覧 N 件" 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: <ul> aria-label 配線 不在`,
    })
  }

  // 2. 旧 <ul className="space-y-3"> (aria-label なし) の残存 detector (regression)
  if (/<ul className="space-y-3">/.test(src)) {
    findings.push({
      level: 'error',
      message: `${path}: 旧 aria-label 無し <ul> 残存 (regression)`,
    })
  } else {
    findings.push({
      level: 'info',
      message: `${path}: 旧 aria-label 無し <ul> 不在 OK`,
    })
  }

  console.log(`\n=== Findings (comment-thread-list-aria-iter447) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
