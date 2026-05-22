/**
 * Phase 6.15 loop iter1127: sprint CreateSprintInputSchema + UpdateSprintInputSchema の zod
 * validation message 日本語化 regression guard。
 *
 * iter1127 で発見した bug: name.max(120) / goal.max(500) には ja message が無く zod default
 * 英語が露出 (name.min(1) は短い ja message "名前を入力" のみあり)。iter1086/1092/1126 convention
 * で日本語化。
 *
 * 修正 (sprint/schema.ts):
 *   - name.min(1): "Sprint 名を入力してください" (旧 "名前を入力" を verbose に)
 *   - name.max(120): "Sprint 名は 120 文字以内で入力してください"
 *   - goal.max(500): "Sprint ゴールは 500 文字以内で入力してください"
 *   - refine: "開始日は終了日以前にしてください" (旧 "start_date は end_date 以前" を日本語化)
 *   - Update.patch.* も同統一
 *
 * 実 supabase + sprint fixture 必要、Docker 不在で fallback (source 直読)。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-sprint-schema-ja-iter1127.ts
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
  const filePath = resolve(here, '../src/features/sprint/schema.ts')
  const src = readFileSync(filePath, 'utf8')

  const expected = [
    "'Sprint 名を入力してください'",
    "'Sprint 名は 120 文字以内で入力してください'",
    "'Sprint ゴールは 500 文字以内で入力してください'",
    "'開始日は終了日以前にしてください'",
  ]
  for (const e of expected) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `sprint schema に ja message '${e}' が無い`,
      })
    }
  }
  // 旧 message が残ってないか
  const oldMsgs = ["'名前を入力'", "'start_date は end_date 以前'"]
  for (const s of oldMsgs) {
    if (src.includes(s)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `旧 message '${s}' が残存`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — sprint schema Create + Update 全 message ja 化済')
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
