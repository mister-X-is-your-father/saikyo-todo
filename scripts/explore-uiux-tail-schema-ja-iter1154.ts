/**
 * Phase 6.15 loop iter1154: 残 schema (auth password / template cronRunId /
 * agent tool template) の ja message 統一 / 体裁修正 regression guard。
 *
 * iter1154 で発見した 3 file 改善:
 *   - auth/schema.ts: password.min(8) message "パスワードは 8 文字以上" → "...で入力してください"
 *     (他 schema の文末統一)
 *   - template/schema.ts: InstantiateTemplate.cronRunId.min(1) に ja message 無し
 *   - agent/tools/template.ts: InstantiateTemplate tool の rootTitleOverride.max(500) に
 *     ja message 無し
 *
 * iter1086/1092/1126-1153 sweep の最終仕上げ。real Supabase 不要、source 直読 invariant。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-tail-schema-ja-iter1154.ts
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

  const authSrc = readFileSync(resolve(here, '../src/features/auth/schema.ts'), 'utf8')
  const templateSchemaSrc = readFileSync(
    resolve(here, '../src/features/template/schema.ts'),
    'utf8',
  )
  const toolTemplateSrc = readFileSync(
    resolve(here, '../src/features/agent/tools/template.ts'),
    'utf8',
  )

  if (!authSrc.includes("'パスワードは 8 文字以上で入力してください'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `auth schema の password message が "...で入力してください" 形式でない`,
    })
  }
  if (!templateSchemaSrc.includes("'cronRunId は空でない必要があります'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `template schema cronRunId に ja message が無い`,
    })
  }
  if (!toolTemplateSrc.includes("'上書きタイトルは 500 文字以内で入力してください'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `agent/tools/template.ts rootTitleOverride に ja message が無い`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — 残 schema 文末統一 + cronRunId + rootTitleOverride ja message 統一済')
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
