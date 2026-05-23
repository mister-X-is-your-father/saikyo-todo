/**
 * Phase 6.15 loop iter1149: sprint + dashboard schema int 制約に ja message 付与
 * regression guard。
 *
 * iter1149 で発見した bug:
 *   - sprint/schema.ts UpdateSprintDefaultsInput startDow.min(0).max(6) /
 *     lengthDays.min(1).max(90)
 *   - dashboard/schema.ts GetBurndownInput days.max(90)
 * に ja message 無く zod default 英語が露出。iter1086/1092/1126-1148 sweep 継続。
 *
 * 実 supabase + Sprint defaults / Burndown chart 必要、Docker 不在で fallback (source 直読)。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-sprint-dashboard-schema-ja-iter1149.ts
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

  const sprintSrc = readFileSync(resolve(here, '../src/features/sprint/schema.ts'), 'utf8')
  const dashboardSrc = readFileSync(resolve(here, '../src/features/dashboard/schema.ts'), 'utf8')

  const sprintExpected = [
    "'曜日は 0 (日) 以上で指定してください'",
    "'曜日は 6 (土) 以下で指定してください'",
    "'Sprint 期間は 1 日以上で指定してください'",
    "'Sprint 期間は 90 日以下で指定してください'",
  ]
  for (const e of sprintExpected) {
    if (!sprintSrc.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `sprint schema に ja message ${e} が無い`,
      })
    }
  }

  if (!dashboardSrc.includes("'集計期間は 90 日以下で指定してください'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `dashboard schema に ja message '集計期間は 90 日以下で指定してください' が無い`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — sprint + dashboard int 制約に ja message 統一済')
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
