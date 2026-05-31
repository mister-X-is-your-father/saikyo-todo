/**
 * Phase 6.15 loop iter1579: bulk-action-bar region landmark aria-label paren を em-dash 区切に
 * migration (iter1093-1578 sweep convention 着地)。
 *
 * 旧 aria-label paren convention `"一括操作 (X 件選択中)"` は iter1093-1578 sweep の em-dash
 * 区切と divergent。区切のみ '(' → ' — ' に統一、closing ')' は削除。
 *
 * 修正 (bulk-action-bar.tsx):
 *   `一括操作 (${count} 件選択中)` → `一括操作 — ${count} 件選択中`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-bulk-action-bar-em-dash-iter1579.ts
 * 前提: なし (source 直読 invariant)
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
  const src = readFileSync(resolve(here, '../src/components/workspace/bulk-action-bar.tsx'), 'utf8')

  if (!src.includes('aria-label={`一括操作 — ${count} 件選択中`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'bulk-action-bar region aria-label が em-dash 区切でない',
    })
  }
  if (src.includes('aria-label={`一括操作 (${count} 件選択中)`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'bulk-action-bar region 旧 paren 区切 aria-label が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — bulk-action-bar region aria-label が em-dash 区切')
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
