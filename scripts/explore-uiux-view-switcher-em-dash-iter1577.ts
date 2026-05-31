/**
 * Phase 6.15 loop iter1577: items-board view-switcher group landmark aria-label を
 * paren convention から em-dash 区切に統一 (iter1093-1576 sweep convention 着地)。
 *
 * 旧 paren convention `"表示切替 (現在: ${X})"` を em-dash 区切に統一。
 * iter1573 operation-board / iter1575 taskchute / iter1576 active-timer region と同 pattern。
 *
 * 修正 (items-board.tsx):
 *   "表示切替 (現在: ${X})" → "表示切替 — 現在 ${X}"
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-view-switcher-em-dash-iter1577.ts
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
  const src = readFileSync(resolve(here, '../src/components/workspace/items-board.tsx'), 'utf8')

  if (!src.includes('aria-label={`表示切替 — 現在 ${VIEW_LABEL_JA[view] ?? view}`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'items-board view-switcher group aria-label が em-dash 形式でない',
    })
  }
  if (src.includes('aria-label={`表示切替 (現在: ${VIEW_LABEL_JA[view] ?? view})`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 paren convention aria-label が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — items-board view-switcher aria-label が em-dash 形式')
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
