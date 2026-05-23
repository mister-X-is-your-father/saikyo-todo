/**
 * Phase 6.15 loop iter1146: okr schema KR weight/position (int) min/max
 * に ja message 付与 regression guard。
 *
 * iter1146 で発見した bug: CreateKeyResultInput / UpdateKeyResultInput の
 * weight.int.min(1).max(10) / position.int.min(0) には ja message 無く zod default
 * 英語が露出 (iter1128 で title/description/unit は ja 化済、int 制約だけ残存)。
 *
 * 実 supabase + OKR API 必要、Docker 不在で fallback (source 直読)。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-okr-int-schema-ja-iter1146.ts
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
  const filePath = resolve(here, '../src/features/okr/schema.ts')
  const src = readFileSync(filePath, 'utf8')

  const expected = [
    "'weight は 1 以上で指定してください'",
    "'weight は 10 以下で指定してください'",
    "'position は 0 以上で指定してください'",
  ]
  for (const e of expected) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `okr schema に ja message ${e} が無い`,
      })
    }
  }

  // 出現回数が Create + Update の 2 path に揃っているか (= 漏れなく)
  for (const msg of expected) {
    const count = src.split(msg).length - 1
    if (count < 2) {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message: `okr schema の ja message ${msg} が ${count} 件 (Create + Update で 2 件期待)`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — okr KR int 制約に ja message 統一済 (Create + Update)')
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
