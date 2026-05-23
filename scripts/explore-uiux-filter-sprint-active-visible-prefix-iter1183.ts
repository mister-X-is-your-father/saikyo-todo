/**
 * Phase 6.15 loop iter1183: items-board filter-sprint select active path aria-label visible-prefix
 * regression guard。
 *
 * iter1183 で発見した iter1068 sweep の active path 漏れ (filter-status iter1182 同 pattern):
 * items-board.tsx `filter-sprint` select の active path 旧 aria-label
 * `Sprint で絞り込み中 (現在: 稼働中の Sprint)。「全 Sprint」で解除` は visible
 * (option text "稼働中の Sprint" / "未割当のみ" / sprint.name) を中位置に持ち voice
 * control prefix-matching「click 稼働中の Sprint」 match 不可 (substring 一致のみ)。
 *
 * 修正 (items-board.tsx): IIFE で visible を先に算出し `${visible} — ...` で先頭固定
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-filter-sprint-active-visible-prefix-iter1183.ts
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
  const filePath = resolve(here, '../src/components/workspace/items-board.tsx')
  const src = readFileSync(filePath, 'utf8')

  if (!src.includes('`${visible} — Sprint で絞り込み中 (現在: ${visible})。「全 Sprint」で解除`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'filter-sprint active path が visible-prefix 形式 "${visible} — ..." でない',
    })
  }
  if (src.includes('`Sprint で絞り込み中 (現在: ${')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 prefix-less "Sprint で絞り込み中 (現在: ...)" が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — filter-sprint active path も visible 冒頭固定済')
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
