/**
 * Phase 6.15 loop iter1549: assignee-picker CommandInput aria-label を em-dash 形式に
 * migration (iter1093-1548 sweep convention 着地)。
 *
 * 旧 aria-label `"アサイン候補を検索 (workspace メンバー / AI Agent)"` は ' を' 助詞接続で
 * iter1093-1548 sweep の em-dash 区切と divergent。iter1545 同 file の PopoverContent
 * (`"アサイン — メンバー / AI Agent を選択"`) と同 surface 内で convention 統一。
 *
 * 修正 (assignee-picker.tsx):
 *   "アサイン候補を検索 (workspace メンバー / AI Agent)"
 *   → "アサイン候補 — workspace メンバー / AI Agent を検索"
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-assignee-picker-search-em-dash-iter1549.ts
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
  const src = readFileSync(resolve(here, '../src/components/workspace/assignee-picker.tsx'), 'utf8')

  if (!src.includes('aria-label="アサイン候補 — workspace メンバー / AI Agent を検索"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'assignee-picker CommandInput aria-label が em-dash 形式でない',
    })
  }
  if (src.includes('aria-label="アサイン候補を検索 (workspace メンバー / AI Agent)"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'assignee-picker CommandInput 旧を助詞接続形式 aria-label が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — assignee-picker CommandInput aria-label が em-dash 形式')
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
