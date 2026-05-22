/**
 * Phase 6.15 loop iter1137: schedule schema 全 note.max(2000) に ja message 付与 regression guard。
 *
 * iter1137 で発見した bug: Create/Update.patch/StartTimer 3 schema の note.max(2000) には ja
 * message 無く zod default 英語が露出 (refine 系は ja message あり)。
 *
 * 修正 (schedule/schema.ts) — 3 schema 全 note.max ja "メモは 2,000 文字以内で入力してください" 付与。
 *
 * 実 supabase + schedule fixture 必要、Docker 不在で fallback (source 直読)。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-schedule-schema-ja-iter1137.ts
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
  const filePath = resolve(here, '../src/features/schedule/schema.ts')
  const src = readFileSync(filePath, 'utf8')

  // 3 note.max(2000, ja) すべて存在を assert
  const jaMatches = (src.match(/max\(2000, 'メモは 2,000 文字以内で入力してください'\)/g) ?? [])
    .length
  if (jaMatches < 3) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `schedule schema: note.max(2000, ja) は 3 箇所必要だが ${jaMatches} 箇所のみ`,
    })
  }
  // 旧 bare note.max(2000) 残存チェック
  const lines = src.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue
    if (/\.max\(2000\)/.test(line)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `行 ${i + 1}: 旧 bare .max(2000) (ja message 無し) が残存: ${line.trim()}`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — schedule schema 3 note.max(2000) 全 ja 化済')
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
