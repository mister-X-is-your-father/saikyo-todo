/**
 * Phase 6.15 loop iter1550: tag-picker CommandInput aria-label を em-dash 形式に
 * migration (iter1093-1549 sweep convention 着地)。
 *
 * 旧 aria-label `"タグを検索 or 新規作成 (Item に紐付けるラベル、新規 tag は色がランダム生成)"` は
 * ' を' 助詞接続で iter1093-1549 sweep の em-dash 区切と divergent。iter1549 assignee-picker
 * CommandInput (`"アサイン候補 — workspace メンバー / AI Agent を検索"`) と同 pattern で
 * tag-picker 同 file の PopoverContent (iter1546) と em-dash convention 統一。
 *
 * 修正 (tag-picker.tsx):
 *   "タグを検索 or 新規作成 (Item に紐付けるラベル、新規 tag は色がランダム生成)"
 *   → "タグ — Item に紐付けるラベルを検索 or 新規作成 (新規 tag は色がランダム生成)"
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-tag-picker-search-em-dash-iter1550.ts
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
  const src = readFileSync(resolve(here, '../src/components/workspace/tag-picker.tsx'), 'utf8')

  if (
    !src.includes(
      'aria-label="タグ — Item に紐付けるラベルを検索 or 新規作成 (新規 tag は色がランダム生成)"',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'tag-picker CommandInput aria-label が em-dash 形式でない',
    })
  }
  if (
    src.includes(
      'aria-label="タグを検索 or 新規作成 (Item に紐付けるラベル、新規 tag は色がランダム生成)"',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'tag-picker CommandInput 旧を助詞接続形式 aria-label が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — tag-picker CommandInput aria-label が em-dash 形式')
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
