/**
 * Phase 6.15 loop iter1142: WaitingForStateSchema 全 max/min に ja message 付与 regression guard。
 *
 * iter1142 で発見した bug: targetLabel.min(1).max(200) / reminderCadenceDays.min(1).max(365) /
 * slackChannelId.max(64) / note.max(2000) には ja message 無く zod default 英語が露出
 * (refine 系は ja message あり)。
 *
 * 実 supabase + item 必要、Docker 不在で fallback (source 直読)。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-waiting-for-state-schema-ja-iter1142.ts
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
  const filePath = resolve(here, '../src/features/item/schema.ts')
  const src = readFileSync(filePath, 'utf8')

  const expected = [
    "'連絡先ラベルを入力してください'",
    "'連絡先ラベルは 200 文字以内で入力してください'",
    "'リマインダー間隔は 1 日以上で指定してください'",
    "'リマインダー間隔は 365 日以内で指定してください'",
    "'Slack channel ID は 64 文字以内'",
    "'メモは 2,000 文字以内で入力してください'",
  ]
  for (const e of expected) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `WaitingForState schema に ja message '${e}' が無い`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — WaitingForState 全 max/min に ja message 統一済')
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
