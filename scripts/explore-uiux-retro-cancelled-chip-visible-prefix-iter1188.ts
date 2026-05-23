/**
 * Phase 6.15 loop iter1188: sprint-retro-widget retro-cause-cancelled chip ariaLabel
 * WCAG 2.5.3 regression guard。
 *
 * iter1188 で発見した重大な WCAG 2.5.3 違反: sprint-retro-widget.tsx の retro-cause-cancelled
 * SeverityChip 旧 ariaLabel `cancelled ${cancelledMid} 件` は visible label "計画外し" を
 * 全く含まず WCAG 2.5.3 (Label in Name) 違反 + voice control「click 計画外し」 match 不可。
 * label と ariaLabel で完全に別言語 (ja vs en) になっており substring 一致すら不成立。
 *
 * 修正 (sprint-retro-widget.tsx):
 *   - 旧 ariaLabel: `cancelled ${rc.cancelledMid} 件`
 *   - 新 ariaLabel: `計画外し ${rc.cancelledMid} 件 (cancelled)`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-retro-cancelled-chip-visible-prefix-iter1188.ts
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
  const filePath = resolve(here, '../src/components/sprint/sprint-retro-widget.tsx')
  const src = readFileSync(filePath, 'utf8')

  if (!src.includes('`計画外し ${rc.cancelledMid} 件 (cancelled)`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message:
        'retro-cause-cancelled ariaLabel が visible-prefix 形式 "計画外し N 件 (cancelled)" でない',
    })
  }
  if (src.includes('`cancelled ${rc.cancelledMid} 件`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message:
        '旧 ariaLabel "cancelled N 件" (visible "計画外し" 完全不含 = WCAG 2.5.3 違反) が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — retro-cause-cancelled ariaLabel は visible "計画外し" 冒頭固定済 (WCAG 2.5.3 satisfy)',
    )
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
