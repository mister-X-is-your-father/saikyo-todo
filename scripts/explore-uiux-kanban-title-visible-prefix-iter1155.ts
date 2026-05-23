/**
 * Phase 6.15 loop iter1155: kanban-view kanban-title button aria-label visible-prefix regression guard。
 *
 * iter1155 で発見した visible-prefix 漏れ: kanban-view.tsx `kanban-title-${id}` button
 * (visible "{item.title}" in span aria-hidden) の旧 aria-label `「title」を編集` は
 * visible "{item.title}" を位置 1 (「」内) に持ち voice control prefix-matching
 *「click {item.title}」 match 不可 (substring 一致のみ)。iter1093-1154 sweep
 * convention が漏れていた。
 *
 * 修正 (kanban-view.tsx): visible title 冒頭固定 + em-dash 区切で descriptive 末尾
 *   - 新: `${item.title} — 編集`
 *   - 旧: `「${item.title}」を編集`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-kanban-title-visible-prefix-iter1155.ts
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
  const filePath = resolve(here, '../src/components/workspace/kanban-view.tsx')
  const src = readFileSync(filePath, 'utf8')

  if (!src.includes('aria-label={`${item.title} — 編集`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'kanban-title button aria-label が visible-prefix 形式 "${title} — 編集" でない',
    })
  }
  if (!src.includes('aria-label={`編集 — 「${item.title}」を編集 (✎ アイコン)`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message:
        'kanban-edit (✎) button aria-label が visible-prefix 形式 "編集 — 「title」を編集 (✎ アイコン)" でない',
    })
  }
  if (src.includes('aria-label={`「${item.title}」を編集`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 aria-label `「title」を編集` (visible 中位置) が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — kanban-title button aria-label は visible title 冒頭固定済')
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
