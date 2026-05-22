/**
 * Phase 6.15 loop iter1138: item-metadata schema 全 max + min に ja message 付与 regression guard。
 *
 * iter1138 で発見した bug: SetItemGoal goal.max(2000) / AddItemIoArtifact label.min(1).max(200) /
 * filePath.max(500) / mime.max(120) / description.max(2000) には ja message 無く zod default
 * 英語が露出 (refine は ja message あり)。iter1086/1092/1126-1137 ja convention で全 max ja 化。
 *
 * 実 supabase + item fixture 必要、Docker 不在で fallback (source 直読)。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-item-metadata-schema-ja-iter1138.ts
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
  const filePath = resolve(here, '../src/features/item-metadata/schema.ts')
  const src = readFileSync(filePath, 'utf8')

  const expected = [
    "'ゴールは 2,000 文字以内で入力してください'",
    "'ラベルを入力してください'",
    "'ラベルは 200 文字以内で入力してください'",
    "'ファイルパスは 500 文字以内で入力してください'",
    "'MIME 型は 120 文字以内で入力してください'",
    "'説明は 2,000 文字以内で入力してください'",
  ]
  for (const e of expected) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `item-metadata schema に ja message '${e}' が無い`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — item-metadata schema 6 ja message 統一済')
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
