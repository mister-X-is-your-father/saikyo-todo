/**
 * Phase 6.15 loop iter1150: sprints-panel sprint-period-edit-btn aria-label visible-prefix regression guard。
 *
 * iter1150 で発見した visible-prefix 漏れ: sprints-panel.tsx
 * `sprint-period-edit-btn-${id}` button の旧 aria-label `Sprint「name」の期間を編集` は
 * visible "期間" (span aria-hidden) を中位置 "の**期間**を編集" に持ち voice control
 * prefix-matching「click 期間」 match 不可。iter1093-1149 sweep convention が漏れていた。
 *
 * 修正 (sprints-panel.tsx): visible "期間" 冒頭固定 + em-dash 区切で descriptive 末尾保持
 *   - 新: `期間 — Sprint「${sprint.name}」の期間を編集`
 *   - 旧: `Sprint「${sprint.name}」の期間を編集`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-sprint-period-edit-visible-prefix-iter1150.ts
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
  const filePath = resolve(here, '../src/components/workspace/sprints-panel.tsx')
  const src = readFileSync(filePath, 'utf8')

  if (!src.includes('`期間 — Sprint「${sprint.name}」の期間を編集`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message:
        'sprint-period-edit-btn aria-label が visible-prefix 形式 "期間 — Sprint「name」..." でない',
    })
  }
  if (src.includes('`Sprint「${sprint.name}」の期間を編集`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 aria-label `Sprint「name」の期間を編集` (visible 中位置) が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — sprint-period-edit-btn aria-label は visible "期間" 冒頭固定済')
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
