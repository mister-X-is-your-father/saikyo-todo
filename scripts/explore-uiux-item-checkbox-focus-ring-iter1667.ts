/**
 * Phase 6.15 loop iter1667: ItemCheckbox に focus-visible ring を追加 — WCAG 2.4.7 Focus
 * Visible 違反を解消。
 *
 * ItemCheckbox は Today / Inbox / Kanban / Backlog / TaskChute / Period view 全 view で
 * 共有される checkbox button だが、focus-visible:ring 系 className が無く keyboard user が
 * Tab focus した時に視覚 indicator が出なかった (WCAG 2.4.7 違反)。EMPTY_CTA_BUTTON_CLASS /
 * Button shadcn / 他 inline custom button と focus convention 統一: `focus-visible:ring-ring
 * focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none`。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-item-checkbox-focus-ring-iter1667.ts
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
  const src = readFileSync(resolve(here, '../src/components/workspace/item-checkbox.tsx'), 'utf8')

  if (!src.includes('focus-visible:ring-ring focus-visible:ring-2')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'ItemCheckbox に focus-visible:ring-2 が無い (WCAG 2.4.7 violation)',
    })
  }
  if (!src.includes('focus-visible:outline-none')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'ItemCheckbox に focus-visible:outline-none が無い (UA default outline と重複)',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — ItemCheckbox に focus-visible ring 着地')
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
