/**
 * Phase 6.15 loop iter1133: doc + tag schema 全 max + regex に ja message 付与 regression guard。
 *
 * iter1133 で発見した bug:
 *   - doc title.max(500) には ja message 無く zod default 英語 (min(1) は ja message あり)
 *   - tag name.max(60) には ja message 無く zod default 英語 (min(1) は ja message あり)
 *   - tag patch.color.regex には ja message 無く zod default 英語 (Create.color.regex は ja message あり)
 *
 * iter1086/1092/1126-1132 ja convention で全 max + regex ja 化。
 *
 * 修正 (doc/schema.ts + tag/schema.ts) — 2 schema 全 max + regex ja 化。
 *
 * 実 supabase + doc/tag fixture 必要、Docker 不在で fallback (source 直読)。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-doc-tag-schema-ja-iter1133.ts
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
  const docSrc = readFileSync(resolve(here, '../src/features/doc/schema.ts'), 'utf8')
  const tagSrc = readFileSync(resolve(here, '../src/features/tag/schema.ts'), 'utf8')

  // doc title.max(500, ja)
  if (!docSrc.includes("max(500, 'タイトルは 500 文字以内で入力してください')")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `doc schema title.max(500, ja) が無い`,
    })
  }
  // tag name.max(60, ja)
  if (!tagSrc.includes("max(60, 'タグ名は 60 文字以内で入力してください')")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `tag schema name.max(60, ja) が無い`,
    })
  }
  // tag patch.color.regex(COLOR, ja)
  // 注: Create.color は元々 ja message があったので維持確認のみ
  const tagRegexMatches = (tagSrc.match(/regex\(COLOR/g) ?? []).length
  const tagRegexJaMatches = (tagSrc.match(/regex\(COLOR, '色は #RRGGBB/g) ?? []).length
  if (tagRegexJaMatches < tagRegexMatches) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `tag schema: ${tagRegexMatches} regex(COLOR) のうち ja message ありは ${tagRegexJaMatches} のみ (全て ja 必要)`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — doc + tag schema 全 max + regex に ja message 付与済')
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
