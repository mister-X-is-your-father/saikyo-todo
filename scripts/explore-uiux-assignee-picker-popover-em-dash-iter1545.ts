/**
 * Phase 6.15 loop iter1545: assignee-picker PopoverContent aria-label を em-dash 形式に
 * migration (iter1093-1544 sweep convention 着地)。
 *
 * 旧 aria-label `"アサイン (メンバー / AI Agent) を選択"` は ' を' 助詞接続で iter1093-1544
 * sweep の em-dash 区切と divergent。
 *
 * 修正 (assignee-picker.tsx):
 *   "アサイン (メンバー / AI Agent) を選択" → "アサイン — メンバー / AI Agent を選択"
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-assignee-picker-popover-em-dash-iter1545.ts
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

  if (!src.includes('aria-label="アサイン — メンバー / AI Agent を選択"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'assignee-picker PopoverContent aria-label が em-dash 形式でない',
    })
  }
  if (src.includes('aria-label="アサイン (メンバー / AI Agent) を選択"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'assignee-picker PopoverContent 旧 paren+を形式 aria-label が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — assignee-picker PopoverContent aria-label が em-dash 形式')
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
