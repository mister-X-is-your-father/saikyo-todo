/**
 * Phase 6.15 loop iter1589: gantt-view today-line role=img aria-label を
 * paren convention から em-dash 区切に統一 (iter1093-1588 sweep convention 着地)。
 *
 * 修正 (gantt-view.tsx):
 *   "今日 (${date}) の縦線" → "今日 ${date} — 縦線"
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-gantt-today-line-em-dash-iter1589.ts
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
  const src = readFileSync(resolve(here, '../src/components/workspace/gantt-view.tsx'), 'utf8')

  if (!src.includes("今日 ${format(new Date(), 'yyyy年M月d日 (eee)')} — 縦線")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'gantt today-line aria-label が em-dash 形式でない',
    })
  }
  if (src.includes("今日 (${format(new Date(), 'yyyy年M月d日 (eee)')}) の縦線")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 paren convention 残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — gantt today-line aria-label が em-dash 形式')
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
