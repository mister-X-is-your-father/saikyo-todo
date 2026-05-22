/**
 * Phase 6.15 loop iter1092: CreateWorkspaceInputSchema を form HTML maxLength={50} / hint
 * "最大 50 文字" に揃え + ja message 完備の regression guard。
 *
 * iter1092 で発見した bug: schema name max(100) が form HTML maxLength={50} と不一致
 * (schema 緩すぎ、超過時 error は zod default 英語 "Too big: expected string to have <=100 characters")。
 * slug max(50) には message 無く zod default 英語が露出。form の hint "最大 50 文字" を source of
 * truth として schema を max(50) に統一 + 全 max/min 制約に ja message 付与 (iter1086 mock-timesheet
 * convention 同)。
 *
 * 修正 (src/features/workspace/schema.ts):
 *   - name max(100) → max(50, 'Workspace 名は 50 文字以内で入力してください')
 *   - slug min(2): '2 文字以上' → 'slug は 2 文字以上で入力してください'
 *   - slug max(50): 無 → 'slug は 50 文字以内で入力してください'
 *   - slug regex: '英小文字 / 数字 / ハイフンのみ' → 'slug は 英小文字 / 数字 / ハイフンのみで入力してください'
 *
 * 本 script は source 直読 invariant assert (実 supabase + form 経由 test は別 unit test で担保)。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-create-workspace-schema-form-iter1092.ts
 * 前提: なし (filesystem 読み込みのみ)
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
  const schemaPath = resolve(here, '../src/features/workspace/schema.ts')
  const src = readFileSync(schemaPath, 'utf8')

  // name は max(50) に統一されているか (max(100) が残存していないか)
  if (src.includes('.max(100)')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `workspace/schema.ts に .max(100) が残存 — form maxLength={50} と不一致`,
    })
  }
  if (!src.includes("max(50, 'Workspace 名は 50 文字以内で入力してください')")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `workspace/schema.ts の name max(50, ja message) が消失`,
    })
  }
  // slug の ja message 確認
  for (const expected of [
    "min(2, 'slug は 2 文字以上で入力してください')",
    "max(50, 'slug は 50 文字以内で入力してください')",
    "regex(/^[a-z0-9-]+$/, 'slug は 英小文字 / 数字 / ハイフンのみで入力してください')",
  ]) {
    if (!src.includes(expected)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `workspace/schema.ts に "${expected}" が無い`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — workspace schema は form maxLength={50} 整合 + ja message 完備')
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
