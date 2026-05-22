/**
 * Phase 6.15 loop iter1131: workflow CreateWorkflowInputSchema + UpdateWorkflowInputSchema 全 max
 * + refine の ja message 付与 regression guard。
 *
 * iter1131 で発見した bug: name.max(200) / description.max(2000) には ja message が無く zod
 * default 英語が露出。refine "patch is empty" は完全 英語。iter1086/1092/1126-1130 ja convention
 * で全 message ja 化。
 *
 * 修正 (workflow/schema.ts) — Create + Update 全 message:
 *   - name min/max: "Workflow 名を入力してください" / "...は 200 文字以内で入力してください"
 *   - description max: "説明は 2000 文字以内で入力してください"
 *   - refine: "更新する項目がありません" (旧 "patch is empty" 完全英語解消)
 *
 * 実 supabase + workflow fixture 必要、Docker 不在で fallback (source 直読)。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-workflow-schema-ja-iter1131.ts
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
    "'Workflow 名を入力してください'",
    "'Workflow 名は 200 文字以内で入力してください'",
    "'説明は 2000 文字以内で入力してください'",
    "'更新する項目がありません'",
  ]
  for (const e of expected) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `workflow schema に ja message '${e}' が無い`,
      })
    }
  }
  // 旧 英語 message が残ってないか
  if (src.includes("'patch is empty'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `旧 英語 refine 'patch is empty' が残存`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — workflow schema Create + Update 全 message ja 化済')
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
