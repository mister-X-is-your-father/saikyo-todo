/**
 * Phase 6.15 loop iter1318: 残 ASCII "..." → Unicode "…" 一括統一 (3 file 4 path)。
 *
 * iter1317 で data-widget-card.tsx を fix した直後、grep で残漏 audit 結果:
 *   - kanban-view.tsx line 167: "列定義を読み込み中..."
 *   - schedule/calendar-view.tsx line 247 + 284: "読み込み中..." (両 lane)
 *   - time-entry/estimate-bias-insight.tsx line 107: "集計中..."
 * いずれも role="status" + aria-live="polite" 経路で WCAG 2.5.3 divergence は無いが、
 * codebase 既存 convention "…" (U+2026) と divergence。iter1091 sweep 残漏 を 1 iter で集約 fix。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-ellipsis-sweep-iter1318.ts
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

const TARGETS = [
  { file: '../src/components/workspace/kanban-view.tsx', expected: '列定義を読み込み中…' },
  { file: '../src/components/schedule/calendar-view.tsx', expected: '読み込み中…' },
  { file: '../src/components/time-entry/estimate-bias-insight.tsx', expected: '集計中…' },
]

const OLD_FORMS = [
  { file: '../src/components/workspace/kanban-view.tsx', old: '列定義を読み込み中...' },
  { file: '../src/components/schedule/calendar-view.tsx', old: '読み込み中...' },
  { file: '../src/components/time-entry/estimate-bias-insight.tsx', old: '集計中...' },
]

async function main() {
  const findings: Finding[] = []
  const here = dirname(fileURLToPath(import.meta.url))

  for (const { file, expected } of TARGETS) {
    const src = readFileSync(resolve(here, file), 'utf8')
    if (!src.includes(expected)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `${file} に "${expected}" (U+2026) が無い`,
      })
    }
  }

  for (const { file, old } of OLD_FORMS) {
    const src = readFileSync(resolve(here, file), 'utf8')
    const codeOnly = src
      .split('\n')
      .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
      .join('\n')
    if (codeOnly.includes(old)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `${file} に旧 "${old}" (ASCII 3 dot) が active code に残存`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — 残 ASCII "..." を Unicode "…" に統一済 (3 file 4 path)')
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
