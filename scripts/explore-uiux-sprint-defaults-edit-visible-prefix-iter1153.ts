/**
 * Phase 6.15 loop iter1153: sprints-panel sprint-defaults-edit-btn aria-label visible-prefix regression guard。
 *
 * iter1153 で発見した visible-prefix 漏れ: sprints-panel.tsx
 * `sprint-defaults-edit-btn` button (visible "編集") の旧 aria-label
 * `Sprint デフォルト (...) の編集モードを開く` は visible "編集" を中位置
 * "の**編集**モードを開く" に持ち voice control prefix-matching「click 編集」
 * match 不可。iter1093-1152 sweep convention が漏れていた。
 *
 * 修正 (sprints-panel.tsx): visible "編集" 冒頭固定 + em-dash 区切で descriptive 末尾保持
 *   - 新: `編集 — Sprint デフォルト (...) の編集モードを開く`
 *   - 旧: `Sprint デフォルト (...) の編集モードを開く`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-sprint-defaults-edit-visible-prefix-iter1153.ts
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

  if (
    !src.includes(
      '`編集 — Sprint デフォルト (現在: ${DOW_JA[cur.startDow]}曜開始 / ${cur.lengthDays} 日) の編集モードを開く`',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message:
        'sprint-defaults-edit-btn aria-label が visible-prefix 形式 "編集 — Sprint デフォルト ..." でない',
    })
  }
  if (
    src.includes(
      'aria-label={`Sprint デフォルト (現在: ${DOW_JA[cur.startDow]}曜開始 / ${cur.lengthDays} 日) の編集モードを開く`}',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 aria-label `Sprint デフォルト ...` (visible 中位置) が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — sprint-defaults-edit-btn aria-label は visible "編集" 冒頭固定済')
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
