/**
 * Phase 6.15 loop iter1129: item CreateItemInputSchema + UpdateItemInputSchema の title.max(500)
 * に ja message 付与 regression guard。
 *
 * iter1129 で発見した bug: Create.title.max(500) / Update.patch.title.max(500) には ja message が
 * 無く zod default 英語 "Too big..." 露出 (title.min(1) は ja "タイトルを入力してください" あり)。
 * iter1086/1092/1126-1128 ja convention で全 max 制約に ja message 付与。
 *
 * 修正 (item/schema.ts) — Create + Update.patch 両方:
 *   - title.max(500): "タイトルは 500 文字以内で入力してください"
 *   - title.min(1): "タイトルを入力してください" (既存)
 *
 * 実 supabase + item fixture 必要、Docker 不在で fallback (source 直読)。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-item-schema-ja-iter1129.ts
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

  if (!src.includes("max(500, 'タイトルは 500 文字以内で入力してください')")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `item schema title.max(500, ja) が無い`,
    })
  }
  // 旧 bare max(500) (Create/Update 両方) が残ってないか — 雑に bare ".max(500)" を検出
  // (改行で続く .optional() / 次の field のため "<行末>$" を partly approximate)
  const lines = src.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // コメント行は除外
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue
    // 純 zod 呼び出し `.max(500)` (引数 1 個 = ja message 無し) を検出
    if (/\.max\(500\)\s*(\.|,|$)/.test(line) && line.includes('title')) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `行 ${i + 1}: 旧 bare title.max(500) (ja message 無し) が残存: ${line.trim()}`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — item schema Create + Update.patch title.max(500) に ja message 付与済')
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
