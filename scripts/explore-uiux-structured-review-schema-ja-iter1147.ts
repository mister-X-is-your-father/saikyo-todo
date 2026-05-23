/**
 * Phase 6.15 loop iter1147: structured-review schema 全 max/min に ja message 付与
 * regression guard。
 *
 * iter1147 で発見した bug: ChecklistItem (point.min/max, comment.max) /
 * Improvement (title.min/max, rationale.min/max) / StructuredReview (checklist.min/max,
 * improvements.max, overall_summary.min/max) の 11 制約に ja message 無く
 * zod default 英語が露出。AC-2 「AI に review」 button の structured output parser、
 * staging UI / Slack 通知 / test に流れるため日本語化が必要。
 *
 * 実 supabase + AI invocation 必要、Docker 不在で fallback (source 直読)。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-structured-review-schema-ja-iter1147.ts
 * 前提: なし
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
  const filePath = resolve(here, '../src/features/agent/structured-review.ts')
  const src = readFileSync(filePath, 'utf8')

  const expected = [
    "'review 観点を入力してください'",
    "'review 観点は 200 文字以内で入力してください'",
    "'判定理由は 300 文字以内で入力してください'",
    "'改善タイトルを入力してください'",
    "'改善タイトルは 200 文字以内で入力してください'",
    "'改善の理由を入力してください'",
    "'改善の理由は 400 文字以内で入力してください'",
    "'checklist は 1 件以上必要です'",
    "'checklist は 15 件以内で指定してください'",
    "'改善提案は 5 件以内で指定してください'",
    "'総合評価を入力してください'",
    "'総合評価は 400 文字以内で入力してください'",
  ]
  for (const e of expected) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `structured-review schema に ja message ${e} が無い`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — structured-review schema 全 max/min に ja message 統一済')
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
