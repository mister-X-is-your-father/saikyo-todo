/**
 * Phase 6.15 loop iter1135: external-source schema (Create + Update) 全 message 日本語化
 * regression guard。
 *
 * iter1135 で発見した bug: name.max(200) / scheduleCron.min(1).max(100) には ja message 無く
 * zod default 英語、refine "patch is empty" は完全英語。iter1086/1092/1126-1134 ja convention
 * で全 message ja 化。
 *
 * 修正 (external-source/schema.ts) — Create 2 union (yamory + custom-rest) + Update.patch:
 *   - name.min(1)/max(200): "Source 名を入力してください" / "...は 200 文字以内で入力してください"
 *   - scheduleCron.min(1)/max(100): "cron 式を入力してください" / "...は 100 文字以内で入力してください"
 *   - refine: "更新する項目がありません" (旧 "patch is empty" 完全英語解消)
 *
 * 実 supabase + external-source fixture 必要、Docker 不在で fallback (source 直読)。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-external-source-schema-ja-iter1135.ts
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
  const filePath = resolve(here, '../src/features/external-source/schema.ts')
  const src = readFileSync(filePath, 'utf8')

  const expected = [
    "'Source 名を入力してください'",
    "'Source 名は 200 文字以内で入力してください'",
    "'cron 式を入力してください'",
    "'cron 式は 100 文字以内で入力してください'",
    "'更新する項目がありません'",
  ]
  for (const e of expected) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `external-source schema に ja message '${e}' が無い`,
      })
    }
  }
  if (src.includes("'patch is empty'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `旧 英語 refine 'patch is empty' が残存`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — external-source schema 全 message ja 化済')
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
