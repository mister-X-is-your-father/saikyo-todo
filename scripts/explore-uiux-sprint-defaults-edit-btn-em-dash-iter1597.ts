/**
 * Phase 6.15 loop iter1597: sprints-panel sprint-defaults-edit-btn 内部 paren+colon を em-dash 区切に
 * migration (iter1093-1596 sweep convention 着地)。
 *
 * 旧 aria-label の内部 `(現在: X曜開始 / Y 日)` paren+colon convention を iter1093-1596 sweep の
 * em-dash 区切に統一。'(' → ' ' (空白)、'現在:' → '現在'、')' → ' ' (空白)。先頭の "編集 — " は
 * iter1153 で既 em-dash 化済、本 iter は 内部 paren+colon のみ更新。
 *
 * 修正 (sprints-panel.tsx):
 *   `編集 — Sprint デフォルト (現在: ${DOW_JA[cur.startDow]}曜開始 / ${cur.lengthDays} 日) の編集モードを開く`
 *   → `編集 — Sprint デフォルト 現在 ${DOW_JA[cur.startDow]}曜開始 / ${cur.lengthDays} 日 の編集モードを開く`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-sprint-defaults-edit-btn-em-dash-iter1597.ts
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
  const src = readFileSync(resolve(here, '../src/components/workspace/sprints-panel.tsx'), 'utf8')

  if (
    !src.includes(
      'aria-label={`編集 — Sprint デフォルト 現在 ${DOW_JA[cur.startDow]}曜開始 / ${cur.lengthDays} 日 の編集モードを開く`}',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprint-defaults-edit-btn aria-label が内部 em-dash 区切でない',
    })
  }
  if (
    src.includes(
      'aria-label={`編集 — Sprint デフォルト (現在: ${DOW_JA[cur.startDow]}曜開始 / ${cur.lengthDays} 日) の編集モードを開く`}',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprint-defaults-edit-btn 旧 paren+colon 内部 区切 aria-label が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — sprint-defaults-edit-btn aria-label 内部 em-dash 区切')
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
