/**
 * Phase 6.15 loop iter1144: structured-plan schema (StructuredPlanStep + StructuredPlan)
 * の max/min に ja message 付与 regression guard。
 *
 * iter1144 で発見した bug: title.min(1).max(200) / est_min.min(1).max(480) / dod.max(300) /
 * dependencies[].min(1) / steps.min(1).max(30) / total_est_min.min(0) / dod_summary.min(1).max(300)
 * の全てに ja message 無く zod default 英語が露出。AI plan parser の error は staging UI /
 * Slack 通知 / test に流れるため日本語化が必要。
 *
 * 実 supabase + AI invocation 必要、Docker 不在で fallback (source 直読)。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-structured-plan-schema-ja-iter1144.ts
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
  const filePath = resolve(here, '../src/features/agent/structured-plan.ts')
  const src = readFileSync(filePath, 'utf8')

  const expected = [
    "'step タイトルを入力してください'",
    "'step タイトルは 200 文字以内で入力してください'",
    "'見積もり (分) は 1 以上で指定してください'",
    "'見積もり (分) は 480 (= 8時間) 以下で指定してください'",
    "'DoD は 300 文字以内で入力してください'",
    "'依存先 step タイトルを入力してください'",
    "'step は 1 件以上必要です'",
    "'step は 30 件以内で指定してください'",
    "'合計見積もり (分) は 0 以上で指定してください'",
    "'DoD サマリを入力してください'",
    "'DoD サマリは 300 文字以内で入力してください'",
  ]
  for (const e of expected) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `structured-plan schema に ja message ${e} が無い`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — structured-plan schema 全 max/min に ja message 統一済')
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
