/**
 * Phase 6.15 loop iter1153: external-source の Yamory / CustomRest config schema 内
 * string.min(1) に ja message 付与 regression guard。
 *
 * iter1153 で発見した bug: iter1135 で top-level (name / scheduleCron) は ja 化済だったが、
 * config 内 (YamoryConfig: token, projectIds[], endpointTemplate, itemsPath, idPath,
 * titlePath, duePath / CustomRestConfig: idPath, titlePath) の string.min(1) に
 * ja message 無く zod default 英語が露出。外部 integration 設定 form は admin user が
 * 手で入力するため日本語化が UX 重要。
 *
 * 実 supabase + external source 必要、Docker 不在で fallback (source 直読)。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-external-source-config-schema-ja-iter1153.ts
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
  const filePath = resolve(here, '../src/features/external-source/schema.ts')
  const src = readFileSync(filePath, 'utf8')

  const expected = [
    "'Yamory API token を入力してください'",
    "'projectId は空でない必要があります'",
    "'エンドポイント template は空でない必要があります'",
    "'items パスは空でない必要があります'",
    "'id パスは空でない必要があります'",
    "'title パスは空でない必要があります'",
    "'due パスは空でない必要があります'",
    "'id パスを入力してください'",
    "'title パスを入力してください'",
  ]
  for (const e of expected) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `external-source schema に ja message ${e} が無い`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — external-source config schema 全 string.min(1) に ja message 統一済')
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
