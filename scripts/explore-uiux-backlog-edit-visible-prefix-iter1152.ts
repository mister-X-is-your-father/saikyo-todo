/**
 * Phase 6.15 loop iter1152: backlog-view edit button aria-label visible-prefix regression guard。
 *
 * iter1152 で発見した visible-prefix 漏れ: backlog-view.tsx `backlog-edit-${id}` button
 * (visible "編集") の旧 aria-label `「title」を編集` は visible "編集" を末尾に持ち
 * voice control prefix-matching「click 編集」 match 不可。iter1093-1151 sweep
 * convention が漏れていた。
 *
 * 修正 (backlog-view.tsx): visible "編集" 冒頭固定 + em-dash 区切で title 末尾保持
 *   - 新: `編集 — 「${row.original.title}」を編集`
 *   - 旧: `「${row.original.title}」を編集`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-backlog-edit-visible-prefix-iter1152.ts
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
  const filePath = resolve(here, '../src/components/workspace/backlog-view.tsx')
  const src = readFileSync(filePath, 'utf8')

  if (!src.includes('`編集 — 「${row.original.title}」を編集`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'backlog-edit button aria-label が visible-prefix 形式 "編集 — ..." でない',
    })
  }
  if (src.includes('aria-label={`「${row.original.title}」を編集`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 aria-label `「title」を編集` (visible 末尾) が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — backlog-edit button aria-label は visible "編集" 冒頭固定済')
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
