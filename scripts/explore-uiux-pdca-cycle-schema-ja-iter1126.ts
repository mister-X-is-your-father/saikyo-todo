/**
 * Phase 6.15 loop iter1126: pdca-cycle CreatePdcaCycleInputSchema の zod validation message
 * 日本語化 regression guard。
 *
 * iter1126 で発見した bug: CreatePdcaCycleInputSchema の title.max(200) / hypothesis.max(4000) /
 * targetMetric.max(200) / targetValue.max(200) には ja message が無く、zod default 英語
 * "Too big: expected string to have <=200 characters" が露出 (title.min(1) のみ ja message あり)。
 * iter1086 mock-timesheet / iter1092 workspace 同 convention で全 max 制約に ja message 付与。
 *
 * 修正 (pdca-cycle/schema.ts): 全 max 制約に ja message 付与。
 *
 * 実 supabase + pdca fixture 必要、Docker 不在で fallback (source 直読 invariant)。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-pdca-cycle-schema-ja-iter1126.ts
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
  const filePath = resolve(here, '../src/features/pdca-cycle/schema.ts')
  const src = readFileSync(filePath, 'utf8')

  const expected = [
    "max(200, 'タイトルは 200 文字以内で入力してください')",
    "max(4000, '仮説は 4000 文字以内で入力してください')",
    "max(200, '指標は 200 文字以内で入力してください')",
    "max(200, '目標値は 200 文字以内で入力してください')",
  ]
  for (const e of expected) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `pdca-cycle schema に ja message '${e}' が無い`,
      })
    }
  }
  // 旧 bare max(200) (CreatePdcaCycleInputSchema 内の最初の出現 = title) が残ってないか
  // 注: UpdatePdcaCycleInputSchema 等の他 schema は無視
  const createSchemaMatch = src.match(
    /export const CreatePdcaCycleInputSchema = z\.object\(\{[\s\S]*?\}\)/,
  )
  if (createSchemaMatch) {
    const createSchema = createSchemaMatch[0]
    if (createSchema.includes('.max(200)\n') || createSchema.includes('.max(4000)\n')) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `CreatePdcaCycleInputSchema に bare .max(N) (ja message 無し) が残存`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — pdca-cycle CreatePdcaCycleInputSchema 全 max に ja message 付与済')
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
