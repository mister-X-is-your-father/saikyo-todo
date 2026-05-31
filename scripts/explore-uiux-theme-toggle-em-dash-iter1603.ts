/**
 * Phase 6.15 loop iter1603: theme-toggle aria-label を em-dash 区切に migration (iter1093-1602 sweep
 * convention 着地、両 path 統一)。
 *
 * 旧 aria-label `'ライトテーマに切替'` / `'ダークテーマに切替'` は ' に' 助詞接続で iter1093-1602
 * sweep の em-dash 区切と divergent。両 path で em-dash 区切に統一。
 *
 * 修正 (theme-toggle.tsx):
 *   `'ライトテーマに切替'` → `'ライトテーマ — クリックで切替'`
 *   `'ダークテーマに切替'` → `'ダークテーマ — クリックで切替'`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-theme-toggle-em-dash-iter1603.ts
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
  const src = readFileSync(resolve(here, '../src/components/shared/theme-toggle.tsx'), 'utf8')

  if (!src.includes("'ライトテーマ — クリックで切替'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'theme-toggle ライトテーマ path aria-label が em-dash 区切でない',
    })
  }
  if (!src.includes("'ダークテーマ — クリックで切替'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'theme-toggle ダークテーマ path aria-label が em-dash 区切でない',
    })
  }
  if (src.includes(": 'ライトテーマに切替' :")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'theme-toggle 旧 を-助詞接続 aria-label が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — theme-toggle 両 path em-dash convention 統一')
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
