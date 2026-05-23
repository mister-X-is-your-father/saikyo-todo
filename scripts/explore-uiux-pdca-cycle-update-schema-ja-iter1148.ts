/**
 * Phase 6.15 loop iter1148: pdca-cycle Update + List schema 全 max/min に ja message
 * 付与 regression guard。
 *
 * iter1148 で発見した bug: iter1126 で Create path は ja 化済だったが
 * UpdatePdcaCycleInputSchema.patch (title.min/max, hypothesis.max, targetMetric.max,
 * targetValue.max, actualValue.max, checkFindings.max, actDecisions.max) と
 * ListPdcaCyclesInputSchema (limit.max(200)) には ja message 無く zod default 英語が露出。
 *
 * 実 supabase + PDCA cycle 必要、Docker 不在で fallback (source 直読)。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-pdca-cycle-update-schema-ja-iter1148.ts
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

  // Update path 固有の ja message (Create path は iter1126 で済)
  const expected = [
    "'実測値は 200 文字以内で入力してください'",
    "'学びは 8000 文字以内で入力してください'",
    "'改善決定は 8000 文字以内で入力してください'",
    "'取得件数は 200 件以下で指定してください'",
  ]
  for (const e of expected) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `pdca-cycle schema に ja message ${e} が無い`,
      })
    }
  }

  // Create + Update で共通の field は 2 出現を期待
  const sharedExpected = [
    "'タイトルを入力してください'",
    "'タイトルは 200 文字以内で入力してください'",
    "'仮説は 4000 文字以内で入力してください'",
    "'指標は 200 文字以内で入力してください'",
    "'目標値は 200 文字以内で入力してください'",
  ]
  for (const e of sharedExpected) {
    const count = src.split(e).length - 1
    if (count < 2) {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message: `pdca-cycle 共通 ja message ${e} が ${count} 件 (Create + Update で 2 件期待)`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — pdca-cycle Update + List 全 max/min に ja message 統一済')
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
