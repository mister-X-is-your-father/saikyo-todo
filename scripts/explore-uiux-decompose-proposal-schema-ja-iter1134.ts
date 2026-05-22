/**
 * Phase 6.15 loop iter1134: decompose-proposal UpdateProposalInputSchema 全 max + refine に
 * ja message 付与 regression guard。
 *
 * iter1134 で発見した bug: title.max(500) / description.max(5000) / dod.max(2000) には ja
 * message 無く zod default 英語が露出。refine '更新項目がありません' は ja だが他 schema は
 * '更新する項目がありません' で表記揺れ → 統一。
 *
 * 修正 (decompose-proposal/schema.ts) — patch 全 message ja 化:
 *   - title.min(1)/max(500): "タイトルを入力してください" / "...は 500 文字以内で入力してください"
 *   - description.max(5000): "説明は 5,000 文字以内で入力してください"
 *   - dod.max(2000): "DoD は 2,000 文字以内で入力してください"
 *   - refine: "更新する項目がありません" (他 schema と表記統一)
 *
 * 実 supabase + proposal fixture 必要、Docker 不在で fallback (source 直読)。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-decompose-proposal-schema-ja-iter1134.ts
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
  const filePath = resolve(here, '../src/features/decompose-proposal/schema.ts')
  const src = readFileSync(filePath, 'utf8')

  const expected = [
    "'タイトルを入力してください'",
    "'タイトルは 500 文字以内で入力してください'",
    "'説明は 5,000 文字以内で入力してください'",
    "'DoD は 2,000 文字以内で入力してください'",
    "'更新する項目がありません'",
  ]
  for (const e of expected) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `decompose-proposal schema に ja message '${e}' が無い`,
      })
    }
  }
  // 旧 表記揺れ '更新項目がありません' 残存チェック
  if (src.includes("'更新項目がありません'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `旧 表記 '更新項目がありません' が残存 (他 schema との表記揺れ)`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — decompose-proposal schema 全 message ja 化済')
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
