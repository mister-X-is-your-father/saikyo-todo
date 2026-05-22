/**
 * Phase 6.15 loop iter1136: api-key CreateApiKeyInputSchema 全 max/min に ja message 付与
 * regression guard。
 *
 * iter1136 で発見した bug: label.min(1).max(120) / scopes.min(1).max(3) には ja message 無く
 * zod default 英語が露出。iter1086/1092/1126-1135 ja convention で全 message ja 化。
 *
 * 修正 (api-key/schema.ts):
 *   - label.min(1)/max(120): "ラベルを入力してください" / "...は 120 文字以内で入力してください"
 *   - scopes.min(1)/max(3): "権限スコープを 1 つ以上選択してください" / "...は最大 3 つまでです"
 *
 * 実 supabase + api-key fixture 必要、Docker 不在で fallback (source 直読)。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-api-key-schema-ja-iter1136.ts
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
  const filePath = resolve(here, '../src/features/api-key/schema.ts')
  const src = readFileSync(filePath, 'utf8')

  const expected = [
    "'ラベルを入力してください'",
    "'ラベルは 120 文字以内で入力してください'",
    "'権限スコープを 1 つ以上選択してください'",
    "'権限スコープは最大 3 つまでです'",
  ]
  for (const e of expected) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `api-key schema に ja message '${e}' が無い`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — api-key schema 全 message ja 化済')
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
