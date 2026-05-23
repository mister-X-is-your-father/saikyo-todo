/**
 * Phase 6.15 loop iter1187: ai-handoff-phase-chip aria-label visible-prefix regression guard。
 *
 * iter1187 で発見した visible-prefix 漏れ: ai-handoff-phase-chip.tsx の SeverityChip 旧
 * `ariaLabel={`AI hand-off: ${desc.chipLabel}`}` は visible {desc.chipLabel} を中位置
 * "AI hand-off: **chipLabel**" に持ち voice control prefix-matching「click {chipLabel}」
 * match 不可 (substring 一致のみ)。SeverityChip は onClick あり時 button render なので
 * visible-prefix 必要。
 *
 * 修正 (ai-handoff-phase-chip.tsx):
 *   - ariaLabel: 旧 `AI hand-off: ${desc.chipLabel}` → `${desc.chipLabel} — AI hand-off`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-ai-handoff-chip-visible-prefix-iter1187.ts
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
  const filePath = resolve(here, '../src/components/agent/ai-handoff-phase-chip.tsx')
  const src = readFileSync(filePath, 'utf8')

  if (!src.includes('`${desc.chipLabel} — AI hand-off`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message:
        'ai-handoff-chip ariaLabel が visible-prefix 形式 "${chipLabel} — AI hand-off" でない',
    })
  }
  if (src.includes('`AI hand-off: ${desc.chipLabel}`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 prefix-less "AI hand-off: ${chipLabel}" が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — ai-handoff-chip ariaLabel は visible "{chipLabel}" 冒頭固定済')
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
