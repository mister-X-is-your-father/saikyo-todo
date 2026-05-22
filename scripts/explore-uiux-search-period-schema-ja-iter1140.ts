/**
 * Phase 6.15 loop iter1140: search + personal-period-goal schema 全 max に ja message 付与
 * regression guard。
 *
 * iter1140 で発見した bug:
 *   - search: query.max(500) / limit.max(MAX_LIMIT) / templateBoost.max(5) に ja message 無く
 *     zod default 英語 (min は ja message あり)。
 *   - personal-period-goal: text.max(2000) / periodKey.min(1).max(20) に ja message 無く zod default
 *     英語 (refine 系は無いがすべて max のみ)。
 *
 * iter1086/1092/1126-1139 ja convention で全 max ja 化。
 *
 * 実 supabase + search/period 必要、Docker 不在で fallback (source 直読)。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-search-period-schema-ja-iter1140.ts
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
  const searchSrc = readFileSync(resolve(here, '../src/features/search/schema.ts'), 'utf8')
  const periodSrc = readFileSync(
    resolve(here, '../src/features/personal-period-goal/schema.ts'),
    'utf8',
  )

  const searchExpected = [
    "'検索語は 500 文字以内で入力してください'",
    '`取得件数は ${MAX_LIMIT} 件以下で指定してください`',
    "'template ブースト倍率は 5.0 以下で指定してください'",
  ]
  for (const e of searchExpected) {
    if (!searchSrc.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `search schema に ja message '${e}' が無い`,
      })
    }
  }
  const periodExpected = [
    "'期間 key を入力してください'",
    "'期間 key は 20 文字以内で入力してください'",
    "'ゴールは 2,000 文字以内で入力してください'",
  ]
  for (const e of periodExpected) {
    if (!periodSrc.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `personal-period-goal schema に ja message '${e}' が無い`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — search + personal-period-goal schema 全 max ja 化済')
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
