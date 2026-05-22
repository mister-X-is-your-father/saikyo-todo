/**
 * Phase 6.15 loop iter1128: okr schema (Goal + KR) Create + Update zod validation message
 * 日本語化 regression guard。
 *
 * iter1128 で発見した bug: Goal title.max(200) / description.max(2000) / KR title.max(300) /
 * unit.max(20) には ja message が無く zod default 英語が露出。refine "start_date は end_date 以前"
 * は技術用語混在。iter1086/1092/1126/1127 convention で全 message ja 化。
 *
 * 修正 (okr/schema.ts) — Goal + KR Create + Update 4 schema 全 message:
 *   - Goal title min/max, description max, refine: "開始日は終了日以前にしてください"
 *   - KR title min/max, unit max
 *
 * 実 supabase + okr fixture 必要、Docker 不在で fallback (source 直読)。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-okr-schema-ja-iter1128.ts
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
  const filePath = resolve(here, '../src/features/okr/schema.ts')
  const src = readFileSync(filePath, 'utf8')

  const expected = [
    "'Goal タイトルを入力してください'",
    "'Goal タイトルは 200 文字以内で入力してください'",
    "'Goal 説明は 2000 文字以内で入力してください'",
    "'Key Result タイトルを入力してください'",
    "'Key Result タイトルは 300 文字以内で入力してください'",
    "'単位は 20 文字以内で入力してください'",
    "'開始日は終了日以前にしてください'",
  ]
  for (const e of expected) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `okr schema に ja message '${e}' が無い`,
      })
    }
  }
  // 旧 message が残ってないか
  if (src.includes("'start_date は end_date 以前'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `旧 refine message 'start_date は end_date 以前' が残存`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — okr schema Goal+KR Create+Update 全 message ja 化済')
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
