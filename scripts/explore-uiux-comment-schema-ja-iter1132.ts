/**
 * Phase 6.15 loop iter1132: comment schema 3 path (CreateCommentOnItem / CreateCommentOnDoc /
 * UpdateComment.patch) の body.max(10_000) ja message 付与 regression guard。
 *
 * iter1132 で発見した bug: body.max(10_000) には ja message が無く zod default 英語が露出
 * (min(1) は ja message あり)。iter1086/1092/1126-1131 ja convention で全 max ja 化。
 *
 * 修正 (comment/schema.ts): 3 path body.max に "本文は 10,000 文字以内で入力してください" 付与。
 *
 * 実 supabase + comment fixture 必要、Docker 不在で fallback (source 直読)。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-comment-schema-ja-iter1132.ts
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
  const filePath = resolve(here, '../src/features/comment/schema.ts')
  const src = readFileSync(filePath, 'utf8')

  if (!src.includes("'本文は 10,000 文字以内で入力してください'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `comment schema body.max(10_000, ja) が無い`,
    })
  }
  // 旧 bare body.max(10_000) (引数 1 個) が残ってないか
  const lines = src.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue
    if (/\.max\(10_000\)\s*(\.|,|$)/.test(line)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `行 ${i + 1}: 旧 bare body.max(10_000) (ja message 無し) が残存`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — comment schema 3 path body.max(10_000) に ja message 付与済')
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
