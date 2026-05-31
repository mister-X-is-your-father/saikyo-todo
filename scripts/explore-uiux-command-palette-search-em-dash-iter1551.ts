/**
 * Phase 6.15 loop iter1551: command-palette CommandInput aria-label を em-dash 形式に
 * migration (iter1093-1550 sweep convention 着地)。
 *
 * 旧 aria-label `"コマンドパレット 検索 (コマンド名 or ? でタスクを fuzzy 検索)"` は ' を' 助詞接続で
 * iter1093-1550 sweep の em-dash 区切と divergent。iter1549/1550 CommandInput
 * (assignee-picker / tag-picker) と同 pattern で global shortcut surface の convention 統一。
 *
 * 修正 (command-palette.tsx):
 *   "コマンドパレット 検索 (コマンド名 or ? でタスクを fuzzy 検索)"
 *   → "コマンドパレット — コマンド名 or ? でタスクを fuzzy 検索"
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-command-palette-search-em-dash-iter1551.ts
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
  const src = readFileSync(resolve(here, '../src/components/shared/command-palette.tsx'), 'utf8')

  if (!src.includes('aria-label="コマンドパレット — コマンド名 or ? でタスクを fuzzy 検索"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'command-palette CommandInput aria-label が em-dash 形式でない',
    })
  }
  if (src.includes('aria-label="コマンドパレット 検索 (コマンド名 or ? でタスクを fuzzy 検索)"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'command-palette CommandInput 旧を助詞接続形式 aria-label が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — command-palette CommandInput aria-label が em-dash 形式')
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
