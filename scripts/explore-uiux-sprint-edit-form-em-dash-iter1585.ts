/**
 * Phase 6.15 loop iter1585: sprints-panel sprint 期間編集 form 操作 group aria-label を
 * paren convention から em-dash 区切に統一 (iter1093-1584 sweep convention 着地)。
 *
 * iter1578-1584 paren → em-dash sweep family と同 pattern。
 *
 * 修正 (sprints-panel.tsx):
 *   "Sprint「${name}」の期間編集 form 操作 (キャンセル / 保存)"
 *   → "Sprint「${name}」の期間編集 form 操作 — キャンセル / 保存"
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-sprint-edit-form-em-dash-iter1585.ts
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

  if (!src.includes('の期間編集 form 操作 — キャンセル / 保存')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprint 期間編集 form 操作 group aria-label が em-dash 形式でない',
    })
  }
  if (src.includes('の期間編集 form 操作 (キャンセル / 保存)')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 paren convention sprint 期間編集 form 操作が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — sprint 期間編集 form 操作 group が em-dash 形式')
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
