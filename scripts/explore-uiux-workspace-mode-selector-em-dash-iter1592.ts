/**
 * Phase 6.15 loop iter1592: workspace-mode-selector radiogroup aria-label paren を em-dash 区切に
 * migration (iter1093-1591 sweep convention 着地)。
 *
 * 旧 aria-label paren convention `"workspace の default 作業モード (現在: X)"` は iter1093-1591 sweep の
 * em-dash 区切と divergent。区切のみ '(現在:' → ' — 現在' に統一、closing ')' は削除。
 *
 * 修正 (workspace-mode-selector.tsx):
 *   `workspace の default 作業モード (現在: X)` → `workspace の default 作業モード — 現在 X`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-workspace-mode-selector-em-dash-iter1592.ts
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
    resolve(here, '../src/components/workspace/workspace-mode-selector.tsx'),
    'utf8',
  )

  if (!src.includes('aria-label={`workspace の default 作業モード — 現在 ${MODE_OPTIONS.find')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'workspace-mode-selector radiogroup aria-label が em-dash 区切でない',
    })
  }
  if (src.includes('aria-label={`workspace の default 作業モード (現在: ${MODE_OPTIONS.find')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'workspace-mode-selector radiogroup 旧 paren 区切 aria-label が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — workspace-mode-selector radiogroup aria-label が em-dash 区切')
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
