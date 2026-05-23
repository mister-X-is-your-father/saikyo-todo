/**
 * Phase 6.15 loop iter1158: backlog-view backlog-title button aria-label visible-prefix regression guard。
 *
 * iter1158 で発見した visible-prefix 漏れ: backlog-view.tsx `backlog-title-${id}` button
 * (visible "{String(getValue())}" in span aria-hidden) の旧 aria-label
 * `「title」を編集` は visible "{title}" を位置 1 (「」内) に持ち voice control
 * prefix-matching「click {title}」 match 不可 (substring 一致のみ)。
 * iter1093-1157 sweep (kanban/today/period-title と同 pattern) が漏れていた。
 *
 * 修正 (backlog-view.tsx): visible title 冒頭固定 + em-dash 区切で descriptive 末尾
 *   - 新: `${String(getValue())} — 編集`
 *   - 旧: `「${String(getValue())}」を編集`
 *
 * sibling backlog-edit (iter1152 修正済 `編集 — 「title」を編集`) と差別化のため
 * title 始まり ↔ "編集 —" 始まり で 2 button SR / voice control 区別を担保。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-backlog-title-visible-prefix-iter1158.ts
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

  if (!src.includes('aria-label={`${String(getValue())} — 編集`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'backlog-title button aria-label が visible-prefix 形式 "${title} — 編集" でない',
    })
  }
  if (src.includes('aria-label={`「${String(getValue())}」を編集`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 aria-label `「title」を編集` (visible 中位置) が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — backlog-title button aria-label は visible title 冒頭固定済')
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
