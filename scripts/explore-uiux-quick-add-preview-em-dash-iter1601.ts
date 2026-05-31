/**
 * Phase 6.15 loop iter1601: quick-add preview live-region aria-label colon を em-dash 区切に
 * migration (iter1093-1600 sweep convention 着地)。
 *
 * 旧 aria-label `"解析結果: ${previewSummary}"` の colon は iter1093-1600 sweep の em-dash 区切と
 * divergent。live region announce text の `:` を ` — ` em-dash に統一。
 *
 * 修正 (quick-add.tsx):
 *   `解析結果: ${previewSummary}` → `解析結果 — ${previewSummary}`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-quick-add-preview-em-dash-iter1601.ts
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
  const src = readFileSync(resolve(here, '../src/components/workspace/quick-add.tsx'), 'utf8')

  if (!src.includes('aria-label={`解析結果 — ${previewSummary}`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'quick-add preview live region aria-label が em-dash 区切でない',
    })
  }
  if (src.includes('aria-label={`解析結果: ${previewSummary}`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'quick-add preview live region 旧 colon 区切 aria-label が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — quick-add preview live region aria-label が em-dash 区切')
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
