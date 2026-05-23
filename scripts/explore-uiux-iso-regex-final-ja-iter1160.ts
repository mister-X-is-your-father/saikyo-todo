/**
 * Phase 6.15 loop iter1160: ISO_DATE / ISO_DATE_RE regex 残箇所の ja message 統一
 * regression guard。
 *
 * iter1156 で item/schema.ts は ISO_DATE_MSG/ISO_TIME_MSG 定数で集約済だったが、
 * 他 schema (agent/tools/write.ts / time-entry/schema.ts / schedule/schema.ts) の
 * regex(ISO_DATE) / regex(ISO_DATE_RE) には ja message 無く zod default 英語が露出。
 * 統一 "YYYY-MM-DD 形式で入力してください" message を付与し sweep 完了。
 *
 * iter1086/1092/1126-1159 sweep の最終仕上げ。real Supabase 不要、source 直読 invariant。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-iso-regex-final-ja-iter1160.ts
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

  const writeSrc = readFileSync(resolve(here, '../src/features/agent/tools/write.ts'), 'utf8')
  const timeEntrySrc = readFileSync(resolve(here, '../src/features/time-entry/schema.ts'), 'utf8')
  const scheduleSrc = readFileSync(resolve(here, '../src/features/schedule/schema.ts'), 'utf8')

  // 3 file 全て同 ja message が出現
  const msg = "'YYYY-MM-DD 形式で入力してください'"
  // write.ts: 2 callsite (startDate + dueDate)
  if (writeSrc.split(msg).length - 1 < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `agent/tools/write.ts に ja message ${msg} が 2 出現していない`,
    })
  }
  // time-entry/schema.ts: 2 callsite (from + to)
  if (timeEntrySrc.split(msg).length - 1 < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `time-entry/schema.ts に ja message ${msg} が 2 出現していない`,
    })
  }
  // schedule/schema.ts: 1 callsite (date)
  if (!scheduleSrc.includes(msg)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `schedule/schema.ts に ja message ${msg} が無い`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — ISO_DATE / ISO_DATE_RE regex 全 callsite に ja message 統一済')
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
