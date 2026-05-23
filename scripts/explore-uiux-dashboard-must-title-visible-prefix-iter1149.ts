/**
 * Phase 6.15 loop iter1149: dashboard-view MUST item title button aria-label visible-prefix regression guard。
 *
 * iter1149 で発見した visible-prefix 漏れ: dashboard-view.tsx
 * `dashboard-must-title-${id}` button の旧 aria-label `MUST「title」を編集` は
 * visible title を中位置 (位置 6 "MUST「**title**」") に持ち voice control
 * prefix-matching「click {title}」 match 不可。iter1093-1148 sweep convention が
 * 漏れていた。
 *
 * 修正 (dashboard-view.tsx): visible title 冒頭固定 + em-dash 区切で descriptive 末尾
 *   - 新: `${item.title} — MUST item を編集`
 *   - 旧: `MUST「${item.title}」を編集`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-dashboard-must-title-visible-prefix-iter1149.ts
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
  const filePath = resolve(here, '../src/components/workspace/dashboard-view.tsx')
  const src = readFileSync(filePath, 'utf8')

  if (!src.includes('`${item.title} — MUST item を編集`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message:
        'dashboard MUST title button aria-label が visible-prefix 形式 "${title} — MUST item を編集" でない',
    })
  }
  if (src.includes('`MUST「${item.title}」を編集`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 aria-label `MUST「title」を編集` (visible 中位置) が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — dashboard MUST title button aria-label は visible title 冒頭固定済')
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
