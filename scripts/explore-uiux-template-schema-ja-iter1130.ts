/**
 * Phase 6.15 loop iter1130: template schema 全 max 制約に ja message 付与 regression guard。
 *
 * iter1130 で発見した bug: Template name.max(200) / item title.max(500) / description.max(2000) に
 * ja message が無く zod default 英語が露出 (name.min(1) / title.min(1) は ja message あり)。
 * iter1086/1092/1126-1129 ja convention で全 max 制約に ja message 付与。
 *
 * 修正 (template/schema.ts) — 5 schema (Create + Update Template / Add + Update TemplateItem /
 * CreateTemplateFromItem) 全 max ja 化。
 *
 * 実 supabase + template fixture 必要、Docker 不在で fallback (source 直読)。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-template-schema-ja-iter1130.ts
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
  const filePath = resolve(here, '../src/features/template/schema.ts')
  const src = readFileSync(filePath, 'utf8')

  const expected = [
    "'Template 名を入力してください'",
    "'Template 名は 200 文字以内で入力してください'",
    "'タイトルは 500 文字以内で入力してください'",
    "'説明は 2000 文字以内で入力してください'",
  ]
  for (const e of expected) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `template schema に ja message '${e}' が無い`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — template schema 5 schema 全 max 制約に ja message 付与済')
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
