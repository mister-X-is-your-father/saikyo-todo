/**
 * Phase 6.15 loop iter1602: gantt-view 依存線 toggle inactive path aria-label を em-dash 区切に
 * migration (iter1093-1601 sweep convention 着地、両 path 統一)。
 *
 * inactive path `'依存線を表示する'` は active path (`'依存線を表示中 — クリックで非表示'`) の
 * em-dash convention と divergent。両 path で visible "依存線" prefix 維持 + em-dash 区切に統一。
 *
 * 修正 (gantt-view.tsx):
 *   inactive: `'依存線を表示する'` → `'依存線 — クリックで表示'`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-gantt-deps-toggle-em-dash-iter1602.ts
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

  if (!src.includes("'依存線 — クリックで表示'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'gantt-view 依存線 toggle inactive path aria-label が em-dash 区切でない',
    })
  }
  if (src.includes(": '依存線を表示する'}")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'gantt-view 依存線 toggle inactive path 旧 を-助詞接続 aria-label が残存',
    })
  }
  // active path 維持確認
  if (!src.includes("'依存線を表示中 — クリックで非表示'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'gantt-view 依存線 toggle active path aria-label が消失',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — gantt-view 依存線 toggle 両 path em-dash convention 統一')
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
