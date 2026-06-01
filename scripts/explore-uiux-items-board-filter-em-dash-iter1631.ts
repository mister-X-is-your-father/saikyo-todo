/**
 * Phase 6.15 loop iter1631: items-board.tsx Item 絞り込み group landmark
 * aria-label を iter1093-1630 em-dash sweep dynamic template convention と統一。
 *
 * 変更前: `Item の絞り込み (MUST / ステータス / Sprint、現在 ${X})` (paren convention)
 * 変更後: `Item の絞り込み — MUST / ステータス / Sprint、現在 ${X}` (em-dash)
 *
 * 並行 fire の parallel agent が iter1629 src/app router landmark で同 sweep を実施。
 * 本 commit は workspace 内 items-board.tsx filter group landmark の取りこぼし回収。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-items-board-filter-em-dash-iter1631.ts
 * 前提: なし (source 直読 invariant only、supabase / docker 起動不可 fire 対応)
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

  // (1) 新 em-dash convention prefix が含まれる
  if (!src.includes('Item の絞り込み — MUST / ステータス / Sprint、現在 ')) {
    findings.push({
      level: 'error',
      source: 'aria',
      message: `items-board.tsx Item 絞り込み group landmark が em-dash convention に未統一`,
    })
  }

  // (2) 旧 paren convention が残っていない
  if (src.includes('Item の絞り込み (MUST / ステータス / Sprint、現在 ')) {
    findings.push({
      level: 'error',
      source: 'aria',
      message: `items-board.tsx に旧 paren convention \`Item の絞り込み (MUST / ...\` が残存`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — items-board.tsx Item 絞り込み group landmark aria-label が em-dash convention に統一済 (iter1631 着地)',
    )
  } else {
    for (const f of findings) console.log(`  [${f.level}/${f.source}] ${f.message}`)
  }
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.filter((f) => f.level === 'error').length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
