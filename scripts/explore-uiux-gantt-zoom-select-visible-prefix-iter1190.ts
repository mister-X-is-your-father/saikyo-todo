/**
 * Phase 6.15 loop iter1190: gantt-view gantt-zoom-select aria-label visible-prefix
 * regression guard。
 *
 * iter1190 で発見した visible-prefix 漏れ (filter-status iter1182 / filter-sprint iter1183
 * と同 pattern): gantt-view.tsx `gantt-zoom-select` select の旧 aria-label
 * `Gantt の 1 日あたりの幅 (現在: 狭 24px/day)` は visible (option text "狭 24px/day" /
 * "標準 40px/day" / "広 64px/day") を中位置 "(現在: ...)" 内に持ち voice control
 * prefix-matching「click 狭 / 標準 / 広」 match 不可 (substring 一致のみ)。
 *
 * 修正 (gantt-view.tsx): IIFE で visible を先に算出し `${visible} — ...` で先頭固定
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-gantt-zoom-select-visible-prefix-iter1190.ts
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
  const filePath = resolve(here, '../src/components/workspace/gantt-view.tsx')
  const src = readFileSync(filePath, 'utf8')

  if (!src.includes('`${visible} — Gantt の 1 日あたりの幅 (現在: ${visible})`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'gantt-zoom-select aria-label が visible-prefix 形式 "${visible} — Gantt..." でない',
    })
  }
  if (src.includes('`Gantt の 1 日あたりの幅 (現在: ${')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 prefix-less "Gantt の 1 日あたりの幅 (現在: ...)" が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — gantt-zoom-select aria-label は visible 冒頭固定済')
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
