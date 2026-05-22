/**
 * Phase 6.15 loop iter1141: workflow internal schemas (Node / Edge / cron / webhook secret) の
 * max/min に ja message 付与 regression guard。
 *
 * iter1141 で発見した bug: WorkflowNode id/label / WorkflowEdge from/to / cron / webhook secret
 * には ja message 無く zod default 英語が露出。これらは JSON editor 経由で user に直接 error が
 * 出るため日本語化が必要。
 *
 * 実 supabase + workflow editor 必要、Docker 不在で fallback (source 直読)。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-workflow-internal-schema-ja-iter1141.ts
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
  const filePath = resolve(here, '../src/features/workflow/schema.ts')
  const src = readFileSync(filePath, 'utf8')

  const expected = [
    "'node id を入力してください'",
    "'node id は 64 文字以内で入力してください'",
    "'node label は 100 文字以内で入力してください'",
    "'edge from を入力してください'",
    "'edge to を入力してください'",
    "'cron 式を入力してください'",
    "'cron 式は 100 文字以内で入力してください'",
    "'webhook secret は 8 文字以上で入力してください'",
    "'webhook secret は 128 文字以内で入力してください'",
  ]
  for (const e of expected) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `workflow internal schema に ja message '${e}' が無い`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — workflow internal schema 9 ja message 統一済')
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
