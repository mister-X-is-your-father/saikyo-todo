/**
 * Phase 6.15 loop iter1139: time-entry schema (Create + List) 全 max/min に ja message 付与
 * regression guard。
 *
 * iter1139 で発見した bug: description.max(2000) / durationMinutes.min(1).max(1440) /
 * limit.min(1).max(500) には ja message 無く zod default 英語が露出。iter1086/1092/1126-1138
 * ja convention で全 ja 化。
 *
 * 実 supabase + time-entry fixture 必要、Docker 不在で fallback (source 直読)。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-time-entry-schema-ja-iter1139.ts
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
  const filePath = resolve(here, '../src/features/time-entry/schema.ts')
  const src = readFileSync(filePath, 'utf8')

  const expected = [
    "'作業内容は 2,000 文字以内で入力してください'",
    "'時間は 1 分以上で入力してください'",
    "'時間は 24 時間 (1440 分) 以内で入力してください'",
    "'取得件数は 1 以上で指定してください'",
    "'取得件数は 500 以下で指定してください'",
  ]
  for (const e of expected) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `time-entry schema に ja message '${e}' が無い`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — time-entry schema 全 ja message 統一済')
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
