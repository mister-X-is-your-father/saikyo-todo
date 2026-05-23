/**
 * Phase 6.15 loop iter1168: comment-thread comment-post button aria-label visible-prefix +
 * WCAG 2.5.3 regression guard。
 *
 * iter1168 で発見した違反:
 * - pending path: 旧 aria-label "コメントを投稿中…" は visible "送信中…" を含まず
 *   substring 一致すら不可 (WCAG 2.5.3 Label in Name 違反 — pending visible "送信中…"
 *   と aria-label "投稿中…" は別語)
 * - not-trim / default path: visible "投稿" を中位置 "コメントを投稿..." に持ち
 *   voice control prefix-matching「click 投稿」 match 不可 (substring 一致のみ)
 *
 * 修正 (comment-thread.tsx): 3 path とも visible 冒頭固定 + em-dash 区切
 *   - not-trim: '投稿 — コメントを投稿するには本文を入力してください'
 *   - pending:  '送信中… — コメントを投稿中…'
 *   - default:  '投稿 — コメントを投稿 (...)'
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-comment-post-visible-prefix-iter1168.ts
 * 前提: なし (source 直読 invariant)
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

interface Finding {
  level: 'error' | 'warning' | 'info'
  source: string
  message: string
}

async function main() {
  const findings: Finding[] = []
  const here = dirname(fileURLToPath(import.meta.url))
  const filePath = resolve(here, '../src/components/workspace/comment-thread.tsx')
  const src = readFileSync(filePath, 'utf8')

  for (const expected of [
    "'投稿 — コメントを投稿するには本文を入力してください'",
    "'送信中… — コメントを投稿中…'",
    "'投稿 — コメントを投稿 (Cmd/Ctrl+Enter でも可、@user で言及・通知)'",
  ]) {
    if (!src.includes(expected)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `comment-post: 新 visible-prefix ${expected} が source に無い`,
      })
    }
  }
  for (const oldLbl of [
    "'コメントを投稿するには本文を入力してください'",
    "'コメントを投稿中…'",
    "'コメントを投稿 (Cmd/Ctrl+Enter でも可、@user で言及・通知)'",
  ]) {
    if (src.includes(oldLbl)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `comment-post: 旧 prefix-less ${oldLbl} が残存`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — comment-post aria-label 3 path とも visible 冒頭固定済 (WCAG 2.5.3 satisfy)',
    )
  } else {
    for (const f of findings) console.log(`  [${f.level}/${f.source}] ${f.message}`)
  }
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
