/**
 * Phase 6.15 loop iter1585: sprint-retro-widget 計画 vs 納品 dl aria-label paren を em-dash 区切に
 * migration (iter1093-1584 sweep convention 着地)。
 *
 * 旧 aria-label paren convention `"計画 vs 納品 (計画 X / 納品 Y / 差分 Z)"` は iter1093-1584 sweep の
 * em-dash 区切と divergent。区切のみ '(' → ' — ' に統一、closing ')' は削除。
 *
 * 修正 (sprint-retro-widget.tsx):
 *   `計画 vs 納品 (計画 X / 納品 Y / 差分 Z)` → `計画 vs 納品 — 計画 X / 納品 Y / 差分 Z`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-sprint-retro-planned-delivered-em-dash-iter1585.ts
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
  const src = readFileSync(
    resolve(here, '../src/components/sprint/sprint-retro-widget.tsx'),
    'utf8',
  )

  if (!src.includes('aria-label={`計画 vs 納品 — 計画 ${planned} 件 / 納品 ${delivered} 件')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprint-retro 計画 vs 納品 dl aria-label が em-dash 区切でない',
    })
  }
  if (src.includes('aria-label={`計画 vs 納品 (計画 ${planned} 件 / 納品 ${delivered} 件')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprint-retro 計画 vs 納品 dl 旧 paren 区切 aria-label が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — sprint-retro 計画 vs 納品 dl aria-label が em-dash 区切')
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
